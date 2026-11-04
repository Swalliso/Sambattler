# Balance changelog

Every change from the SPEC's first-pass numbers, with the guardrail or verification result that
motivated it. Tools: `npm run balance -- duel`, `npm run balance -- tournament`, `npm run test:slow`.

Every entry below this note, through the 2026-10-31 ones, tunes the v1 battle, which [SPEC v2](../SPEC.md)
replaces. None of it is open work, including headings that say "Open:". From milestone R1, new
entries measure or tune v2's round battle (SPEC §11, §12). "The backlog" in the entries below means
v1's, now [archived](../docs/archive/v1/balance-backlog.md).

## R2b-S14 T171: `bosslives` deleted, with its schema key and the run's read (2026-11-04)

**Approved by the user** (2026-11-04, "Start both" to the hub's plan, relayed by the hub). In R2b's playtest the user's
`bosslives` run changed nothing they could see ("I'm not really sure what changed with it"): Cordis lost no life, and her
boss Heartcap never came close to falling (`docs/playtest-feedback.md`, 2026-11-04). §8.5, §18.2 #16, A199.
- **Gone:** the preset in `src/data/proto.ts`, which leaves `PROTO_PRESETS` empty; `livesAtBoss` in the schema, so a spec
  setting it is refused; `playerHeartcapMax`'s per-life term in `src/run/flow.ts`; and the boss node's badge on the route.
- **No outcome moved:** the key was absent from `data/balance.json`, so the shipped rules and every golden are unchanged.

## R2b-S13: §16 R2's verification, no data change (2026-11-04)

No data, rule or golden changed. S13 ran SPEC §16 R2's steps 1–9 on the data after retune B, and every step passes, step
7 with T168's ten known misses (`docs/r2b-plan.md`'s As built; the numbers in `docs/balance-backlog.md`, "R2b S13"). Step
5 now reads "every run completes, in 3 to 5 battles" (the user, 2026-11-04), and `tools/sim.ts`'s run check with it.
- **Waiting on the user, at S14 (T169):** G1, G2 and G7; G4's round-9 clause (22%) and G5 (89%), with the two upgrade
  levers; G14 and G15 with Cordis's rework, then the boss re-read.
- **R3 takes** G3, G8's mono clause and G16's pairs.

## R2b-S12 T131: G14's and G15's bands, and retune B (2026-11-04)

**Approved by the user** (#35, 2026-11-04, relayed by the hub): "B, the boss too", with the bands and Cordis's plan as
recommended. Measured in `docs/balance-backlog.md` ("R2b S12"), `bot:balanced`, 100 runs a commander. SPEC §11.1, §11.10,
§12.3 and D28.
- **The bands** (`data/balance-targets.json`): G14 stays 70–90% of battle 1s for each commander. G15 stays 40–70% of boss
  fights won and at least 40% reaching the boss, with reach now **at most 95%** (from 85%). With 3 lives over 3–4 battles
  before the boss, 85% needs battles 2–4 won only about 45% of the time.
- **The general's income** (`enemyIncomeMult`): × 1.05 → **× 1.10**. Vesper's battle 1 drops from 93% to 88%. G4's bot
  wins 55% (from 63%), G8 reads 50% for `bot:balanced` and 63% for `bot:answer`, and G6 and G13 still pass.
- **Armilla's Burster Pod** (`data/commanders.json`): in her starter for the Puffball Mortar, and in her core for the
  Rhizome Vault, which no draft deals before R3's combos. Her battle 1 rises from 59% to 74% at × 1.10.
- **The general's kit** (`enemyKit`): **3** upgrade levels a battle index past the first (from 1), and the boss's **12**
  (from 4). Battles 2–4 are won 78%, 68% and 69% (from 84%, 82% and 80%).
- **The boss's Heartcap** (`heartcapEnemyHp.boss`): 3,600 → **4,500**, which 6 capped rounds still rout.
- **The result** (`npm run balance -- tournament --commanders all`):
  - G14: Vesper 88%, Armilla 74% and Cordis 100% (band 70–90%). `bot:answer` reads 88%, 59% and 100%.
  - G15: 96% of runs reach the boss (≤ 95%), and 71% of boss fights are won (40–70%). Vesper wins 66 of 98, Armilla 43 of
    91 and Cordis 96 of 100.
  - Runs won: Vesper 66%, Armilla 43%, Cordis 96%. M5's spread is 53 points, from 32.
- **Still known misses, now owned by S14:** G14, on Cordis alone, and G15, held up by her runs (T168, T169). No data
  brings her battle 1 under 91%; S14 reworks her as a rule change with the user's OK (her cards, and a Puppet Bloom that
  lifts less).
- **Goldens:** regenerated in the same branch on the final rules (T132).

## R2b-S12 T129: v1's keys retired, and R2a's `rounds` blocks folded into §11.1's names (2026-11-04)

**No number changed** (T129, §11.1, §14.2; X8's knobs deleted by the user's call, 2026-11-03, "Cleanup first", after S11
measured that neither moves G14 or G15). The goldens move only because the battle's library carries the balance; T132
regenerates them.
- **The fold:** `data/balance.json`'s `rounds` block moved to the top level under the same names (`maxRounds`,
  `clashCapSeconds`, `heartcapDamagePerSupply`, `roundDamageCap`, `sporestorm` by round, `stipendPerRound`,
  `interestPer` 10 and `interestCap` 30, `comebackGold`, `enemyIncomeMult`, `draftRounds`, `upgradeCostPct`, `lives`,
  `plotGrowth` and the rest). Its `ai` block joined the kept `ai` keys: `mergeOffSlayerShare`, and in `ai.counter` the
  multipliers, noise, sells and intel beside the cycles by round and `freePlots`. `data/balance-targets.json`'s `rounds`
  block replaced v1's blocks of the same names; G2 stays as it was. A `--proto` path drops its `rounds.` prefix:
  `--proto upgradeCostPct:400`.
- **Retired from the data and the schema:**
  - `data/balance.json`: `waveSeconds`, `incomeTickSeconds`, `stipendPerTick`, `supplyCap`, v1's `interestPer` 20 and
    `interestCap` 10, `comebackDivisor`, `comebackMax`, `supplyLinePerColumn`, `fullRefundSeconds`, `besiegedSeconds`,
    `besiegedRate`, `firstSpawnFraction`, `timeLimitSeconds`, `turret`, `captureSeconds`, `captureRatio`,
    `captureDecayMult`, the time-based `sporestorm`, `routRepair`, `decisionLossDamage`, `groveRepair`, `draftWaves`,
    `laneStance`, `movement.spawnOffset` and `spawnJitter`, and v1's `ai` timings and placement score.
  - X8's `ai.leanToLastAnswer` (0) and `ai.replaceWhenFull` (false), with their code in the general's planner.
  - Buildings: `hp` (the Puffball Mortar's 500 moved to `attack.hp`, its emplacement's), `spawn`, `economy.goldPerTick`
    and the Rhizome Vault's `utility` block (its v2 effect comes with R3's combos, #26).
  - Limits: `afterSeconds` (`afterRound` stays) in `data/bots.json` and `data/generals.json`.
  - The DSL: v1's stats (`building.hp`, `spawnInterval`, `spawnCount`, `goldPerTick`, `firstSpawnFraction`,
    `side.supplyCap`, `captureSpeed`, `supplyLineRate`, `turretDamage`, `powerCooldown`), the `zone` and
    `adjacentOwnBuildingsGte` selectors, the `buildingDestroyed` and `waveStart` triggers and the `repairHeartcapPct`
    action. Their no-op compile path went with them.
  - The Heartcap `turret` sprite, and the sounds of v1's events (`spawn`, `column-gained`, `column-lost`,
    `building-lost`, `building-razed`, `counter-warn`, `counter-active`, `wave`), which R2b's S2 replaced.

## R2b-S5b T159–T163: gold upgrades once the colony is full, and the general's income × 1.05 (2026-11-03)

**The rule and both numbers were approved by the user** (#67, 2026-11-03): the details as recommended ("Take them all",
and "Take both" when the hub relayed them), and the price with its counterweight ("300% and ×1.05"). SPEC §6.1, §6.2
and §11.1.
- **`rounds.upgradeCostPct`: 300** (new). Once a side's colony is full, an `upgrade` command buys one of its spawners an
  upgrade for 300% of the building's cost: a Burrow's 330, a Hall's 450. That squad then arrives Bloomed for the rest of
  the battle. The general and the bots buy them too, once no plot is free. T159's measurement shows why: with drafts on,
  both colonies fill at round 5 and then bank a median of about 300 a round with nothing to buy.
- **`rounds.enemyIncomeMult`: 1.0 → 1.05.** T163's sweep (`docs/balance-backlog.md`) found no price of 150–300% that
  keeps G4 and G8 in band, since upgrades favour your side:
  - The baseline, with no upgrades: `bot:balanced` beats the scripted general 65%, 13% of battles reach round 9, and G8
    reads balanced 51%, answer 69%.
  - At 200% alone: 71%, 18%, then 73% and 88%.
  - At 300% with × 1.05: 63%, 21%, then 61% and 77%, with about one upgrade a battle each side.
  - G13 holds throughout, with 6–9% of clashes at the cap and a median clash of 18–19.5 s.
- **A new known miss:** G4's round-9 clause, at 21% against ≤ 20%, until S14's tuning (T168, T169).
- **Goldens:** regenerated on `develop` with S7's commanders merged. All seven moved at round 1's first checkpoint, since
  the battle's library carries the new key. The battle replays move further where a colony fills and buys upgrades, and
  with the general's income: `r2-balanced-vs-scripted-s1` now ends in round 5, not 6, and S7's `r2-armilla-power-s3` in
  round 9, not 7.

## R2b-S7 T079–T090, T154–T156, T165, T166: the commanders, the powers, the generals, the elites and the boss's extra cards in v2 form (2026-11-03)

**Content the user approved at R2b's S0** (2026-11-03, "Take them all": R2-Q7, R2-Q15, R2-Q16, R2-Q17, R2-Q18 and #69,
SPEC §6.6, §7.6–§7.8, §11.10, §11.11), with #69's draw settled in S7 (2026-11-03, "Take both"). No unit, building or
rule number was retuned.
- **The commanders' passives** (`data/commanders.json`):
  - Vesper's Home Brood: `unit.hp` and `unit.damage` ×1.1 on squads at rank 0 (R2-Q15; was home buildings spawning 10%
    faster). A uniform bonus, so a front-rank squad fields the same count.
  - Armilla's Landholder: `side.plots` +1, the next closed plot by #19's order, so the first third-rank plot from battle 1
    (§4.6; was capture +25%). It's on her side only, so the general's colony doesn't gain it.
  - Cordis: `unit.hp` ×1.1 at tiers 2 and 3, so merged units start with +10% HP, and `side.mergeRadius` 2.0 kept
    (R2-Q7; knit time −50% is gone, since it acted only after the muster).
- **The powers** (`data/commanders.json`, `src/data/schema.ts`): `cooldown` and `firstReady` are gone from the data and
  the schema (§6.6), and so are v1's `tithe` and `surge` kinds.
  - Rhizome Tithe is `{ kind: harvest, target: none, goldPerSupply: 2 }` (was 30 gold a column held): 2 gold for each
    supply of enemy units killed so far in the clash (`ClashState.killedSupply`: a merged unit at its own supply, an
    emplacement at 0), rounded down and credited at once as clash gold (R2-Q16, R2-Q20). It may fire at 0 kills.
  - Puppet Bloom lifts each of your units within 3 tiles of a point one merge tier where it stands, its HP and shield
    in proportion (R2-Q7; was merging every same-type trio there). It's no knit: no merge is counted and no `merge`
    trigger fires. It skips what a knit can't take: emplacements, Bursters, tunnelers underground, a knitting unit,
    a squad with its toggle off and a lane whose clash is over.
  - The Sporestorm Sigil's ×1.5 now reaches each power (T084): Spore Burst 135, the Tithe 3 a supply, Puppet Bloom
    4.5 tiles, and the previews read the scaled values.
  - The auto power policy: the Tithe fires on the first think from 40 s of clash time, or once either side's surviving
    supply in a lane still fighting is at most 25% of what it fielded there after the muster (R2-Q16). Puppet Bloom
    fires on its first think where the lift adds the most supply (an Elder's lift counts twice a Bloomed one's).
- **The generals' passives** (`data/generals.json`): Old Mother Mold's swarm units `unit.hp` ×1.1 (R2-Q17; was swarm
  buildings spawning 10% faster); the Lichen Baron's `unit.hp` ×1.2 at rank 0 (was buildings +20% HP); the
  Blightwright's kept; the Pale Sovereign's `unit.damage` ×1.15 where `inCounterSet`, the union of its dual
  doctrine's sets and the active counter's, read at each Begin (R2-Q17; was turrets +25%). Their descriptions say so.
- **The elites** (`data/elites.json`): Swift is `unit.speed` ×1.15 (was an instant first spawn); Fortified and Veteran
  are kept.
- **Several openers per general** (`data/generals.json`, `moreOpeners`, #69): each battle draws one, from the general's
  own stream, among the openers whose cards its kit holds; the kit is still built from the first. Old Mother Mold: a
  Sporeling Burrow and a Gill Archer Nest, or two Burrows and the Nest, both from battle 2, so her battle 1 keeps
  R2-Q13's Burrow and Cellar. The Lichen Baron: a Capguard Hall and a Puffball Mortar (battle 2), or a Hammercap Forge and
  a Truffle Cellar (battle 3). The Blightwright: the Rootbreaker Den with a Capguard Hall (battle 2) or a Gill Archer Nest
  (battle 3). The Pale Sovereign: a Capguard Hall, a Puffball Mortar and a Truffle Cellar, or a Gill Archer Nest, a
  Sporeling Burrow and a Cellar. The scripted general keeps its one opener. Not measured yet: S11's run tools read
  what the new openers do to battles 2–4 and the boss.
- **The opening doctrine** swaps the opener's last army card for the cheapest kit card in its counter sets (the boss's
  two) when the kit holds one and the opener's army holds none (R2-Q18, A042). It applies to the drawn opener.
- **The boss's first extra cards** read R2a's counter sets: for each of the run's top two intel kinds, the cheapest
  card not yet in its kit whose unit beats the armor the kind reads (Swarm light, Line medium, Armor heavy; Elite and
  Ranged take their set's cheapest), as a missing answer is chosen (A056). Against a Swarm that's the Rhizomorph
  Tunnel and against a Line the Veilstalker Hollow, where v1's sets gave the Sporeling Burrow and the Morel Warren.
- **Goldens:** the Vesper and Cordis power replays and `r2-run-s7` moved (the run again with the openers); `r2-armilla-power-s3` is new (T156). The
  three replays with no commander or general passive hold their hashes, byte for byte. On seed 3 with the starter
  kits, Vesper and Cordis rout the scripted general in round 3 (Puppet Bloom lifting 11 units), and Armilla falls in
  round 7, her five Tithes paying 100 gold. Verify's adaptive-general smoke moved from seeds 20–21 to 4–5: a single
  battle's Mold draws among all her openers, and 44 of seeds 1–60 reach her round-4 counter, as before S5's softer
  opener.

## R2b-S6 T070–T078: the relics in v2 form, the `requires` gates and one path for clash gold (2026-11-03)

**Content the user approved at R2b's S0** (2026-11-03, "Take them all": R2-Q19, R2-Q20, #24 and #26, SPEC §11.7). No
unit, building or rule number was retuned.
- **The 21 relics** (`data/relics.json`) take §11.7's v2 effects, and every text is rewritten for v2:
  - New effects: Thick Caps `unit.hp` ×1.15 at rank 0 (was buildings +15% HP); Fruiting Season `building.goldPerRound`
    +12 (was `building.goldPerTick` +1); Rot Ward `side.heartcapDamageTaken` ×0.85, 8500 bp at §6.7 step 3 (was turrets
    +25%); Quick Roots `unit.openingSpeed` ×1.25 on melee units (was capture +20%); Fresh Spores `building.squadCount` +1
    where `plantedThisRound` (was an instant first spawn); Root Stipend `side.stipend` +24 (was +2 a tick); Forward
    Spores a `clashStart` cloud on each lane's enemy front rank, 1.5 tiles, 4 s, 10 a second (was the supply-line
    surcharge halved); Mycelial Web `side.plots` +1 (was supply cap +6); Mending Moss a `roundWon` `healHeartcap` of 100
    (was 2% a wave); Mycorrhizal Link `side.comboCorners` behind `requires: combos`, so out of the pool until R3; the
    Sporestorm Sigil `side.powerEffectMult` ×1.5 from the storm's first round (was cooldown −30%; S7's T084 applies it
    to each power); Rot-Eater +1 gold an enemy unit killed from the storm's first round; Martyr's Bloom a `squadWiped`
    burst of 60 crush within 2.0 (was on a building destroyed).
  - Kept: Hardy Spores, Deep Cellars, Spore Tithe, Knitting Circle, Second Flush, Bloom Vigor, Spore Cloud (its death
    burst now runs in rounds, where R2a listed it and ran nothing) and Elder's Patience.
- **The Rhizome Vault** (`data/factions/velvet-bloom/buildings.json`) gets `requires: combos` (#26): it leaves drafts,
  spoils, events, every general's kit and a single battle's roster, so Armilla's core offers five cards. With
  Mycorrhizal Link out too, the draft pool holds 19 relics with powers on.
- **Clash gold** (R2-Q20): `pendingGold` is gone. An effect's gold in a clash is credited at once, with a `gold` event
  of source `clash`, counted in `goldEarned.clash`, and shown as the next income's "from the clash" row.
- **Mycelial Web's plot** opens when a battle is created, and at once when a draft picks it (S5's pick recompile).
- **Goldens:** all six moved at round 1's first checkpoint, since the state's shape changed (`goldEarned.clash` for
  `pending`, the compiled side's new fields, the map's open order, the gated kits). Regenerated on `develop` with S5's
  drafts and S9's run screens merged, the five battle replays play out as they do there: the same winners, rounds,
  damage and gold on their recorded commands. `r2-run-s7` moves further, since the run's pool and relics changed.

## R2b-S5 T064–T069: drafts in planning, #27's upgrade levels, and Old Mother Mold's opener (2026-11-03)

**Goldens:** `r2-run-s7` moved, since run battles draft now and Mold's opener changed; it was refreshed with
`npm run golden -- update` (T068, T069). The five single-battle goldens hold unchanged: a battle without drafts holds
no pool and compiles as before.
- **Drafts in planning (T065, T067):** a battle with drafts on opens a draft in the planning after each round in
  `balance.rounds.draftRounds` [2, 4, 6], so in rounds 3, 5 and 7, once the general has planned (§4.7, §8.3). v1's
  cards, weights (35/45/20), rerolls (20, then +10) and skip (+40) are unchanged, and `draftWaves` stays until T129.
  Run battles draft from S5 on, and a won battle pays each draft it ended before as an extra spoils pick: 3 cards,
  no reroll, with an elite's +10 rare (#17's Rout half, the user, 2026-11-03).
- **#27's upgrade levels (T064), the user at S0 (2026-11-03: "Take them all", then "Keep R1's call"):**
  - `offered: false` with empty effects on the levels that do nothing in rounds: the Truffle Cellar's and the Spore
    Exchange's level 2 (HP +200), the Amanita Lodge's level 3 (spawn speed), the Rhizome Vault's whole track, and the
    unit levels, the Sporeling Burrow's and the Morel Warren's level 3 (+1 unit per spawn, which R1's review gate
    retired: §18.2 #7). Drafts, spoils, events and the general's levels skip past them, so the levels after them stay
    reachable (A105): the Cellar goes from level 1 to 3, and the Exchange's interest +10 is its second card.
  - `building.goldPerTick` +1 becomes `building.goldPerRound` +12, a new stat the round compile applies: the Truffle
    Cellar's levels 1 and 3 and the Spore Exchange's level 1.
  - Texts: the Rootbreaker's level 3 is "+25% to emplacements", and the Mortar's levels name its emplacement.
- **Old Mother Mold's battle-1 opener (T068, R2-Q13, the user, 2026-11-03: "Soften Mold's opener"):** `opener`
  `["sporelingBurrow", "sporelingBurrow"]` becomes `["sporelingBurrow", "truffleCellar"]` (`data/generals.json`,
  §7.8), so her battle-1 kit holds both and the Gill Archer Nest joins in battle 2. No opening pick is built. S1b's
  measurement (`docs/balance-backlog.md`): battle 1 is won 82%, 52% and 76% for Vesper, Armilla and Cordis with
  this opener, against 52%, 29% and 45% before; Armilla stays short of G14 until T082's Tithe, and S11 re-reads G14
  with the drafts in.

## R2b-S9: the Anti-Ranged intel icon (2026-11-03)

**No balance value changed, and no golden moved.** `data/sprites/ui.json` gains `i-ranged`, a 16×16 arrow, so the
route's and the summary's intel bars show Anti-Ranged beside v1's four kinds (§7.4, §7.6; the stand-in S1 left for
S9). Sprites aren't battle state, and no sprite id changed.

## R2b-S4c T170–T174: the flyers preset deleted, and no new presets (2026-11-03)

**No balance value changed, and no golden moved.** The user, 2026-11-03: "I'm not personally a fan of having a bunch
of these that we have to keep track of", then, on the hub's plan, "Cleanup first".
- **`src/data/proto.ts`** keeps one preset, `bosslives`, which R2b's playtest (S14) adopts as data or deletes (#16).
  `flyers` is gone: the round sim never had flyer rules, and flyers are out of the first release (X9).
  `?proto=flyers` now reads as an unknown preset (A117).
- **Gone with it:** the `flying` balance block and the `flying` tag (`src/data/schema.ts`), and the Driftling's and
  the Drift Stalk's sprites (`data/sprites/units.json`, `buildings.json`), which nothing else read. Flyers' design
  stays in SPEC §1.3 #11, §5.3, §11.2 and §11.3, and the sprites are in git history.
- **X8's knobs** (`rounds.ai.leanToLastAnswer`, `rounds.ai.replaceWhenFull`) stay off in `data/balance.json` until
  S12 (T129), which deletes them unless S11 shows the general needs one.
- **The rule from now on:** no new named presets. A candidate rule is a data change, measured with the
  `--proto path:value` override, or code on a short-lived branch, measured there and merged as the default with the
  user's OK, or deleted. Any temporary switch names the session that removes it.

## R2b-S4 T055–T061: the presets of retired systems deleted (2026-11-03)

**No data value changed, and no golden moved.** The deletions are §16 R2's list and R1's knob outcomes (A109), which
the user approved at R1's review gate (2026-11-02) and R2b's S0.
- **`src/data/proto.ts`** keeps the agreed default-off knobs: `flyers` and `bosslives`. Gone: `b1`, `a3`, `b4`,
  `hold`, `nohold`, `t1`, `t2`, `t3`, `diver`, `diverleap`, `hotstart`, `breach`, `bigdrafts`, `callforhelp`, `waves`,
  `mixedwave`, `stormwaves`, `swarmread`, `rework`, `noeldersplash`, `clashpace` and `clashshield`, and `a2` and `b3`,
  which the user dropped on 2026-11-03 ("Drop both") since no battle in rounds read them. A spec naming one is
  refused by the tools and shown as unknown on the page (A117).
- **Schema keys that only those presets set** are gone from `src/data/schema.ts`. v1's keys still in the data
  (`laneStance`, the timed storm's `heartcapTakenPerStack`, the `waveStart` and `buildingDestroyed` triggers) wait for
  T129, since the battle state hashes the balance.
- **`flyers` in squad form:** the Drift Stalk fields a squad of 6 Driftlings (§11.2), with no HP and no spawn timer,
  and `flying` lost `holdsGround`. A spawner needs a `squad` block, and only a tower needs `hp`.

## R2b-S1 T164: one fixed round cap, 750 for both Heartcaps (2026-11-03)

**A rule number, approved by the user** at R2b's S0 ("Fixed 750 for both", 2026-11-03, §18.2 #68).
- **`balance.rounds.roundDamageCap`** is `{ "flat": 750 }`, from `{ "maxHpBp": 2500 }` (X5's 25% of the loser's max HP:
  500 for battle 1's general, 750 for your 3000, 900 for the boss). The Decision still compares shares of max HP.
- **Why:** at R2a's gate the user found the share cap asymmetric, and with the cap binding in 70% of damaging rounds a
  bigger Heartcap raised its own cap, so D28's bigger Heartcaps barely cost rounds. S21b measured a fixed 750 passing
  G4, G6, G8's bands and G13: a median of 6 rounds, 13% reaching round 9, the bot winning 65%
  (`docs/balance-backlog.md`).
- **Tests and text that named the cap as a share follow it:** the cap's scenarios (`round-damage-cap`,
  `lane-empty-one-side`, `lane-empty-both`, `decision-round-9`) say 750, and `both-heartcaps-zero` plays in round 5
  (×1.2), so the general's lane deals 720, under the cap, and you still win the round E8 needs. The round tip and
  the storm tip say "at most 750 HP".
- **Goldens:** the five round replays moved; v1's seven battle replays didn't.

## R2b-S1 T019: the events in rounds (2026-11-03)

**Rules the user approved** at R2b's S0 (§8.7's first guesses, "Take them all", 2026-11-03, `docs/r2b-plan.md`). A
run has lives and each battle its own Heartcap since R2b's S1, so there's no run-long Heartcap to repair or shrink:
- **Fallen Oak**'s `maxHpPct` −0.15 now lowers every later battle's Heartcap max (the run's `heartcapMaxPct`), not the
  run's Heartcap. Its text says so.
- **Quiet Clearing**'s Rest is `nextBattle.heartcapMaxHpPct` 0.15, +15% max HP in the next battle, in place of v1's
  `repairPct` 0.15. Forage keeps v1's random upgrade level until R3.
- **Mold Bloom** is `nextBattle.sporestormShiftRounds` −1 with +150 gold: the storm starts at round 4, not 1:00 early.
- **The schema:** `gainLife` (the Grove's regained life, §8.7) replaces `repairPct`, and `nextBattle` takes
  `sporestormShiftRounds` and `heartcapMaxHpPct` in place of `sporestormShiftSeconds`. A v1 save's pending Rest and
  storm shift migrate to them (`src/run/migrate.ts`, #32).
- `routRepair`, `decisionLossDamage` and `groveRepair` stay in `data/balance.json`, read by nothing, until R2b's T129.
- **Goldens:** none moved; the run golden is re-recorded on rounds in T027.

## R2a-S21b T159: the Burster in the front line (2026-11-03)

**A rule change, approved by the user** ("Yes, start both", 2026-11-03, on the hub's recommendation after G16's
levers were measured, and their playtest note "bursters in the front rank also felt pretty good"). No data changed.
- **SPEC §7.3's back-line tags lose `burst`:** a spawner whose unit has the `ranged` or `support` tag, and every tower,
  is a back-liner; every other spawner, the Burster Pod's among them, is a front-liner. It changes the general's and
  the bots' placement (`src/sim/rounds/ai/formationScore.ts`) and the tools' formation by role (`BACK_TAGS` in
  `tools/lib/clash.ts`), so G16's Burster pairs are same-role.
- **Why:** G16's formation rule put a Capguard front with Bursters behind, and the same colony with its Bursters in
  front won every one of those clashes (0%, 36% of G16's pool). G16 reads 40%, from 24% (`docs/balance-backlog.md`'s
  S21b entry); G3, G4, G12 and G13 hold where they were.
- **Goldens:** one round replay moved, `r2-twin-roots-balanced-vs-scripted-s3` (a Burster Pod the general plants in
  round 4). The other four round replays and v1's eight didn't.

## R2a-S18 T125: the pace, 100 a supply, and #35's bands for R2a (2026-11-03)

**A rule number, approved by the user** ("Take them all" in S18 on S18's proposal of 75, then through the hub "Yes,
with the rerun" and, after the 200-battle rerun, "Go to 100", 2026-11-03). **The five round replays moved, v1's eight
didn't**: rounds' state hashes its rules, and v1's library leaves `balance.rounds` out (Call 27).
`git diff --stat tests/golden/m*` shows nothing.
- **`rounds.heartcapDamagePerSupply` 25 → 100** (SPEC §6.7, §18.3; R2a/T124, T125). Over 200 battles of `bot:balanced`
  against the scripted general: at 25, a median of 9 rounds, 67.5% reaching round 9 (G4: ≤ 15% at first); at 75,
  7 rounds and 23.5%; at 100, 7 rounds and 18.5%. The bot wins 58.5% at each. The round's damage cap binds in 15% of
  damaging rounds at 25, 60% at 75 and 70% at 100. Of the levers measured, only damage per supply moved the pace far;
  the cap, the Heartcaps' HP and the Sporestorm moved it less (`docs/balance-backlog.md`'s S18 entry). S14b's playtest
  had found the late rounds empty once the colony was full.
- **`comeback-r4`'s deficit 700 → 1550** (G6, #35): what a 3000-HP side loses in rounds 1–3 of G4's 200 battles at 100 a
  supply, by each round's median (200, 600, 750). The same method gives 425 at 25 a supply.
- **Three rule scenarios keep their rule at the new number:** `decision-round-9`'s Heartcap starts at 1800 (was 1500), so
  the share still gives you the Decision that damage dealt would give the general; in `both-heartcaps-zero` the
  general has 3600 max HP, so your capped 900 still wins the round its capped 750 loses (E8); in `split-lanes` it
  has 3000, so your capped 750 still beats its 600 (E7). The other scenarios' expected damage follows the number;
  `scoring.test.ts` keeps §6.7's steps worked at 25 a supply, set on the state.
- **`balance-targets.json`'s `rounds` bands** (#35, R2a's part): G4 over 200 battles (was 40), 6–8 rounds, ≤ 20% at round 9
  (was 15%), the bot 30–70%; G6 20–45% and ≥ 50%; G8 40–65% for `bot:balanced` and at most 80% for `bot:answer`, one
  band per policy; G13 ≤ 15% capped and a median clash of 15–40 s (was 20–40); G16 ≥ 60%. G14 and G15 are R2b's.

## R2a-S18: the round guardrails' targets and bots (2026-11-03)

**New bots and targets. No golden moved**: neither v1's nor rounds' state reads `balance-targets.json`, and a bot
reaches a battle's state only when it plays. Nothing was retuned; T124's readings and the pace proposal are in
`docs/balance-backlog.md`, for the user's call at T125.
- **`bot:answer`** (R2a/T121, X7, SPEC §12.2, agreed at S0 on 2026-11-02): `bot:balanced`'s opener, weights and limits, with
  `policy: "answer"`. In rounds it scores each card it may buy by its unit's hits on the general's planned squads,
  weighted by their supply, and leans × 3 toward the best; a tie goes to the card the squads' hits are weakest on.
  G8 reads it beside `bot:balanced` (T123); G3 and G12 stay on fixed weights. v1 ignores the field.
- **`bot:slayer-rounds` and `bot:slayer-rounds-nomerge`** (R2a/T123, SPEC §12.3 G7): G7's Slayer check in rounds, beside v1's
  `slayer` so v1's G7 reading doesn't move. They keep `slayer`'s weights (Veilstalker Hollow 8), which field 24–25%
  of both sides' supply as Slayers, read from the `fielded` record at each unit's tier (target about 25%).
- **`balance-targets.json` gets a `rounds` block** (R2a/T119, SPEC §12.3): G1, G3–G8, G11, G12, G13 and G16 in round form,
  beside v1's blocks until R2b. The battle-level bands (G4, G6's two clauses, G8, G13, G16) are §12.3's first guesses
  until the user sets them from T124's measurement (§18.2 #35, T125). G11's round form takes the arrival, turn,
  planning-command and full-colony budgets S17 held in `tools/lib/rounds/bench.ts`.

## R2a-S17: `bench-300` in round form (2026-11-03)

**Test data only, no golden moved.** No number or rule changed, and v1 never reads `data/scenarios/rounds/`. Logged at S20
(T138), which found the scenario without an entry.
- **`bench-300`** (R2a/T114, SPEC §13.7, §15.4): the bench's clash in rounds, 150 placed units a side on the 3-lane test map,
  with merging off. `npm run bench -- --rounds` plays it as repeated fresh clashes, and `tests/unit/rounds/scenarios.test.ts`
  asserts its exact outcome: every lane level at the cap.

## R2a-S15: X8's two knobs, both off (2026-11-03)

**Data with no effect by default. v1's goldens didn't move**; the round golden `r2-balanced-vs-scripted-s1` was refreshed,
since rounds' library hashes its whole balance, the two new keys included. Its battle plays exactly as before: the
scripted general doesn't adapt, so the counter cycle never reaches it, and with the keys removed its opening hashes
to the old golden. v1's library leaves `balance.rounds` out (R2a Call 27).
- **`rounds.ai.leanToLastAnswer` 0 and `rounds.ai.replaceWhenFull` false** (R2a/T101, X8, SPEC §7.2): two default-off knobs
  for the playtest, read only by a general that runs the counter cycle. With the lean above 0, from round 2 its weights
  on the answer to last round's army are × (1 + lean). With replace-when-full on, once its colony is full it sells its
  lowest-weighted fielded spawner at 60% for the heaviest card that outweighs it and that it can afford, once a turn.
  Agreed at R2a S0 (X8, 2026-11-02: "Take every recommendation"); turning either on is the user's call after X8's readouts.

## R2a-S10b: `general-plans-first` and the first round golden (2026-11-02)

**Test data only. v1's goldens didn't move**; `tests/golden/r2-balanced-vs-scripted-s1.replay.json` is the first round
golden (T072). No number or rule changed, and v1 never reads `data/scenarios/rounds/`.
- **`general-plans-first`** (R2a/T070, SPEC §16 R2 step 4): your Capguard Hall and Gill Archer Nest against the scripted
  general on Bogwater Hollow. `tests/unit/rounds/scenarios.test.ts` asserts round 1's lane, damage and comeback gold, and
  that the general's colony and army stand before your first command in rounds 1 and 2, hash-equal under two different
  plans of yours.

## R2a-S7: the round scenarios (2026-11-02)

**Test data only, no golden moved.** No number or rule changed, and v1 never reads `data/scenarios/rounds/`.
- **The rule scenarios** (R2a/T048, SPEC §16 R2 step 4): 19 files in `data/scenarios/rounds/`. They are
  `formation-from-plots`, `clash-cap`, `round-damage-cap` and `decision-round-9`, one for each of §6.7's E1–E8, and
  G6's `comeback-r4`, with clash-form copies of v1's `merge-trio`, `knit-cancel`, `elder-ladder` and
  `merge-under-fire` and of R4a's `unit-lineup` and `unit-lineup-twin`. v1's own files stay until R2b.
  `tests/unit/rounds/scenarios.test.ts` asserts each one's lanes, damage and comeback gold exactly.

## R2a-S1: R1's chosen set as default data, and the rounds data (2026-11-02)

**v1's goldens moved once, from the adopted set** (`npm run golden -- update`, T014). Every change rests on a
decision the user made: R1's review gate (S8, 2026-11-02: #7, #8, #9), R2a's S0 (2026-11-02: R2-Q2, R2-Q5, R2-Q6)
and R4a-S0 (2026-11-01: #53), all dated in `docs/tasks/clarify.md`. Measured: `docs/balance-backlog.md`, R2a S1.
- **Adopted, all of `kept`** (`data/balance.json`, the faction files; T011): `pinned {radius 1, rateMult 0.35}`;
  `sporeCloud` on the Puffball Mortar (range 7, 1.5 tiles, 6 s, 10 a second), without `aiCover` (A118);
  `cleave` on the Scythecap, whose splash goes 0.8 / 1.0 / 1.2 → 1.0 / 1.2 / 1.4; `burst` clouds (1.5 tiles, 4 s, 10
  a second). The Burster and Burster Pod, and the Rhizomorph and Rhizomorph Tunnel, join `units.json`,
  `buildings.json` and both rosters, as `kept` defined them. The Elder Sporeling keeps its splash (#9).
- **`tierRadiusMult` 1.25 → 1.0** (#53): a merged unit's collision radius no longer grows, nor its drawn body.
- **R2-Q5's weights** (`data/bots.json`, `data/generals.json`; T012): the Burster Pod and the Rhizomorph Tunnel at
  weight 1 in every data bot (`bot:balanced`, rush, turtle and greedy, and G7's mirrors `balanced-nomerge`, `slayer` and
  `slayer-nomerge`, as `aiWeight` gave all seven) and in every general's weights. `aiWeight` retires, with
  the kit append that gave every run kit the rework's spawners (A048): a general's run kit now takes them only
  through its `preferred` list. The Mortar's `laneCover` placement term goes with `aiCover`.
- **Rounds data, which moves no v1 hash** (T008–T010; Call 27: `buildLibrary` leaves it out of v1's library, and
  `tests/unit/determinism.test.ts` checks it): `balance.rounds`, with the arrival shield (#8) under
  `rounds.arrivalShield {minTypes 2, shieldFrac 0.2}`; the round damage cap `{maxHpBp: 2500}` and a Decision by
  share of max HP (X5, the user's decision at R1's gate, not hash-only); interest 10 / 30 (R2-Q2). Each spawner's
  `squad` from §11.2's column, with Capguard Hall at 3 (#7); `economy.goldPerRound` (the Truffle Cellar 50, the
  Spore Exchange 12); and `afterRound` beside every `afterSeconds`, one round a minute (R2-Q6).

## R4a-S5: a lighter Gray Rot (2026-11-02)

**Display only, no golden moved.** It rests on the user's answer to R4-Q4 at R4a-S0 (2026-11-01,
`docs/tasks/clarify.md`): the colour-vision check moves into R4a, with a lighter, bone body for the Gray Rot. No
number or rule changed: faction palettes aren't battle state.
- **`data/factions/gray-rot/faction.json`** (R4/T034): the Gray Rot's swap tones `v #7d8a7a → #b0bcab`,
  `l #b8c4a8 → #eaf0e2` and `d #4b5649 → #808b7c`, the first guess as agreed. `s`, `t` and the mat are unchanged.
  Every `factionSwap` sprite (units, buildings, the Heartcap, turrets) bakes its Gray Rot copy from these.
- **The check** (R4/T033, `tests/unit/contrast.test.ts`, SPEC §2), through `tools/lib/cvd.ts`'s matrices:
  - team: the sides' `v`, `l` and `d` differed by 1.00–1.10:1 under deuteranopia and protanopia; now 1.51–2.13:1
    (floor 1.5). The tightest pair is `l` under deuteranopia, at 1.51:1.
  - soil: the Gray Rot's `v` and `l` stand 3.57:1 or more off every `t-soil` tone, plain and under both filters
    (floor 1.75). The Velvet Bloom's lowest is 1.77:1, its `v` on `#5e4532`.
  - outline: the Gray Rot's `d` stands 4.73:1 or more off the `k` outline `#1a1020` (floor 1.5); the Velvet
    Bloom's, 2.02:1.
- **Not changed:** the UI's `--rot` tokens, the report's colours, the HP bars and the run-map icons keep v1's ash
  (`#7d8a7a`, `#b8c4a8`). They aren't bodies, and none of T033's cases reads them.

## R4a-S4: the other seven redrawn (2026-11-01)

**Display only, no golden moved.** Like R4a-S3, it rests on the silhouette sheet the user approved as drawn
(R4/T026, `docs/r4a-plan.md`) and on their decision that units carry no weapon mark (T077, SPEC §5.8). No number
or rule changed: sprites aren't battle state, and no sprite id changed.
- **`data/sprites/units.json`** (R4/T031): `u-tender`, `u-veilstalker`, `u-scythecap`, `u-morelRunner`,
  `u-rootbreaker`, `u-rhizomorph` and `u-driftling` are redrawn, each with a shape block (`{ body }`) and three
  frames: the approved sheet's frame 0, a second walk frame and an attack frame. The attacks: the Tender's lantern
  flares, the Veilstalker lunges, the Scythecap dips into its sweep, the Morel Runner leans into a jab, the
  Rootbreaker crouches into a smash, the Rhizomorph's jaw drops open and the Driftling's pod swings forward.
  - Heights: the Tender, the Veilstalker and the Driftling 9 px; the Scythecap and the Rootbreaker 12 (11 in the
    attack frame), the Morel Runner and the Rhizomorph 12. Widths: the Veilstalker 9 (10 in its lunge), the Morel
    Runner and the Driftling 9, the Tender and the Rhizomorph 12, the Scythecap 15 (16) and the Rootbreaker 16, all
    within their squads' bounds at base + 1. The Veilstalker's and the Scythecap's sprites are 1 px wider than the
    sheet's, for the attack frame.
  - The Rhizomorph's burrowed mound is still `mound()`'s, and the Driftling still draws no shadow of its own.
- **Every unit sprite declares a shape** (R4/T032, `src/data/registry.ts`): a `u-` sprite, or one a unit draws,
  with no shape block fails to load. `tests/unit/shapes.test.ts` (R4/T030) holds the whole roster to two rules: no
  two frame 0s overlap with an IoU of 0.75 or more on their anchors unless their boxes differ by 2 px (the highest
  pair is 0.69, the Capguard and the Scythecap), and every frame's width fits its spawner's base squad + 1 (the
  Rhizome Vault). R1 hasn't proposed squad sizes yet, so the squads are today's spawn-derived ones: 10 px for the
  Sporeling, Capguard, Gill Archer, Hammercap, Burster, Veilstalker, Morel Runner and Driftling, 16 for the rest.
  The Velvet Shrine's +2 is still only listed: the Tender, Scythecap, Rootbreaker and Rhizomorph overflow it.
- **`docs/r4a-silhouettes.json` is deleted** (T032), now that every sprite is drawn from it. The approved version
  stays at `dbd7f09:docs/r4a-silhouettes.json`.

## R4a-S3: the core six and the Mortar's emplacement redrawn (2026-11-01)

**Display only, no golden moved.** It rests on the silhouette sheet the user approved as drawn on 2026-11-01
(R4/T026, `docs/r4a-plan.md`), and on their decision that units carry no weapon mark (T077, SPEC §5.8). No number
or rule changed: sprites aren't battle state, and no sprite id changed.
- **`data/sprites/units.json`** (R4/T028): the sheet has `bands` (small 8–9, medium 11–12, big 15–16 px).
  `u-sporeling`, `u-capguard`, `u-gillArcher`, `u-amanitaKnight`, `u-hammercap` and `u-burster` are redrawn, each
  with a shape block (`{ body }`) and three frames: the approved sheet's frame 0, a second walk frame and an attack
  frame. The attacks: the Sporeling lunges, the Capguard crouches behind its cap, the Gill Archer has loosed its
  arrow, the Knight dips its dome, the Hammercap's maul comes down and the Burster swells.
  - Heights: the Sporeling and the Burster 8 px, the Gill Archer 9, the Capguard and the Hammercap 12 (11 in the
    attack frame) and the Knight 16 (15). Widths: 8 to 10 px, and the Knight's 16, all within their squads' bounds.
  - The other seven keep their v1 sprites until R4a-S4.
- **`data/sprites/buildings.json`** (R4/T029): `e-puffballMortar` (new), 24 × 22 and anchored at its centre, a
  structure body with no mark. Frame 0 is the approved one, and a second frame glints spores in the barrel, for a
  view that animates a building's two frames. v1's battle still draws the Mortar as `b-puffballMortar`.
- **The tower check** (`src/data/registry.ts`): every tower with an attack has an `e-<id>` sprite that declares a
  structure body, or the data fails to load. `emplacementSprite()` in `src/render/unitSprite.ts` finds it.

## R4a-S2b: the mark glyphs retired (2026-11-01)

**Display only, no golden moved.** It rests on the user's decision of 2026-11-01, at the silhouette sheet's review
(R4/T026, T077): units carry no weapon mark, now or later, so the field shows less clutter and each archetype's
silhouette tells it apart (SPEC §5.8). It supersedes R4-Q2 and §18.2 #55's answers, below. No number or rule
changed, and no frame the game draws changed: no unit sprite had a shape block yet.
- **Deleted:** `data/sprites/marks.json` and its seven glyphs (`m-blade`, `m-arrow`, `m-spike`, `m-hammer`,
  `m-area`, `m-heal`, `m-splash`). The atlas bakes nothing over a frame.
- **The shape block** is `{ body }` alone, and it's strict, so the registry rejects a block that names a mark. A
  unit's damage type shows in its silhouette, the hit sparks, the matchup marks on cards and the planning screen,
  and the inspect panel.

## R4a-S2: the mark glyphs (2026-11-01)

**Display only, no golden moved.** It rests on R4a's plan, agreed by the user on 2026-11-01 (R4/T007,
`docs/r4a-plan.md`), and on R4-Q2 and §18.2 #55's answers: shared glyphs, the heal mark for the Tender. No number
or rule changed: sprites aren't battle state, and no unit sprite declares a shape yet, so no frame the game draws
changed.
- **The glyphs** (R4/T021): `data/sprites/marks.json` (new), sheet `marks`, with no faction swap: `m-blade` (a
  diagonal blade), `m-arrow` (an open arrowhead), `m-spike` (a solid point), `m-hammer` (a head on a haft),
  `m-area` (an ×) and `m-heal` (a +), each 5 × 5, and the accent `m-splash` (5 × 4). Each has a spore-white
  `#fbf6ff` core inside a dark `#1a1020` outline, so it reads on both sides' bodies. The arrow and the spike both
  point to the front, so they read as one family (SPEC §5.8, §14.3).
- **How they're used:** the atlas bakes `m-<mark>` onto a unit's frame at its sprite's `shape.markAt[frame]`, and the
  accent at `shape.accentAt[frame]`, once R4a-S3 and S4 give the unit sprites their shape blocks. The registry checks
  each shape against its unit and the sheet's bands.
- **For the sheet review (R4/T026):** in 5 × 5 with an outline all round, a glyph's core is at most 3 × 3. So the
  hammer's haft, the + and the × have 1-px strokes, short of §14.3's "every stroke at least 2 native px wide". If
  they don't read at Twin Roots' 1.78×, the fix is a bigger glyph, which changes §14.3's 5 × 5.

## R4a-S1: the lineups and the pip (2026-11-01)

**Display only, no golden moved.** It rests on R4a's plan, agreed by the user on 2026-11-01 (R4/T007,
`docs/r4a-plan.md`), with only Elders rimmed (R4-Q3). No number or rule changed: sprites aren't battle state, and no
golden replays these scenarios.
- **The lineups** (R4/T009): `data/scenarios/unit-lineup.json` on Bogwater Hollow and `unit-lineup-twin.json` on
  Twin Roots place every default-data unit at tiers 1, 2 and 3 on both sides, for R4a's screenshots (SPEC §16 R4
  step 2). They replace `elder-showcase.json`, which is deleted.
- **The pip** (R4/T014): `i-pip` in `data/sprites/ui.json`, a 3 × 3 gold `#f0c85a` core in a 1-px dark `#120a16`
  outline (5 × 5, its corners clear), with no faction swap. One marks a Bloomed unit and two an Elder, on the field
  and in the inspect panel, in place of v1's bigger merged sprites (SPEC §5.8, §10.4). It's in `REQUIRED_SPRITES`.

## Combat rework: flyers take rule C (2026-10-31)

**Approved by the user for the playtest** ("Let's go with your recommendations"). It's a prototype setting, so no
shipped number, rule or default changed, and the goldens are unchanged.
- **`flyers`, and so `rework`:** `flying.reachSupply` 2 → 1 and `flying.meleeMult` 1 → 0.5. Every unit can hit a
  flyer, ground melee at ×0.5, and the Mortar's lobbed shell and the Burster's burst still can't. The design's
  reach rule is `flying.reachSupply:2,flying.meleeMult:1`.
- **Why** (backlog, "After P2"): on the playtest `rework`, mono Drift Stalk's G3 falls from 89 / 96 to 72 / 90,
  the strict bar still passes, and G4 at 200 passes (8:04, 11%, 50%). Mono Sporeling rises from 79 / 82 to
  83 / 86 and mono Veilstalker from 60 / 71 to 69 / 80. The other fallback, the 2-supply Driftling (95 / 98), is
  dropped.
- **Text:** the Drift Stalk's description and the cards' flyer rows follow the rule.

## Combat rework: the general's swarm read and flyers (2026-10-31)

**Nothing adopted; no shipped number, rule or default changed.** Goldens unchanged. Both join `rework`, the
package for the P3 playtest.
- **The swarm read** (preset `swarmread`): a new default-off knob, `ai.counter.swarmMaxSupply`. An adaptive
  general reads a spawner whose unit costs at most that much supply by its armor, whether or not its units
  merge; the preset sets 1. Under P2's package the Lichen Baron read a merging Sporeling swarm as Elite in 155
  of 199 reads, and SPEC §7.4 means a merging swarm to read that way. With the knob, 199 of 199 read Swarm.
- **Flyers** (preset `flyers`, docs/archive/v1/ideas/flyers.md):
  - a `flying` tag and a balance setting, `flying`: units of 2+ supply, ranged units, turrets, other flyers,
    clouds and powers reach a flyer, merging doesn't grant reach, melee ×1, and flyers hold no ground;
  - the Driftling (70 HP, light, 8 slash a second, 1 supply, speed 1.4) and its Drift Stalk (160 gold, two
    every 18 s, `aiWeight` 1), in both rosters, as content under the preset;
  - sprites in `data/sprites/` (display only). The Bloatcap isn't built.
- **The sanity pass on `rework` with both** (backlog, "After P2"): G4 at 200 passes (8:06, 12%, 52%), the strict
  bar passes with flyers answering the swarm, and **mono Drift Stalk takes over G3 (89 / 96)**. Not retuned.

## Combat rework P2 measurements (2026-10-31)

**Nothing adopted; no shipped number, rule or default changed.** Goldens unchanged.
- **`rework` became P2's package:** P1d's base without the Mortar's clouds, plus `stormwaves` at 0.2 (the
  user's answers to P1d). The swarm read and flyers joined it after P2 (above).
- **Tools:** `npm run experiment` gains `--g4seeds n`, and its g3 check runs on `--workers` threads.

Results are in [the backlog](../docs/archive/v1/balance-backlog.md#combat-rework-p2-2026-10-31); P2 was wrapped up early for
the playtest:
- **The package passes the strict counter bar and G4 at 200 games** (7:56, 12.5% Decisions, bot wins 52%), and
  fails G3 on mono Sporeling (85 / 86) and mono Veilstalker (72 / 87).
- **Which pieces carry it:** waves and the two-type shields carry the strict bar, the storm carries G4, pinned
  keeps the archers down, call for help keeps G2 healthy, and the Burster and the Elder change hold the swarm
  and the runners in G3. The Rhizomorph carries nothing measured.
- **The adaptive general doesn't answer the swarm** under the package (G8, 100 seeds).
- **Runs:** battle-1 losses rise from 79 to 108 of 240 (Armilla and Cordis), and waves cause it.

## Combat rework P1d prototypes (2026-10-31)

**Nothing adopted; no shipped number, rule or default changed.** Goldens unchanged.
- **Fix:** P1c's dead-unit skip in the attack loop now runs only with `burster` on. Before, a unit that
  Vesper's Spore Burst killed lost that tick's attack in every battle. 72 commander battles now match develop.
- **`rework` is the user's new base:**
  - the six settings, with mixed waves at two types;
  - the Burster;
  - the Elder Sporeling's splash off, as a preset path (the shipped unit keeps it);
  - a 20 s beat. Cleave stays its own preset.
- **New `stormwaves` setting:** each Sporestorm stack makes both sides' waves 20% bigger, ×2 at five stacks
  (8:00). Extra units need free supply, but the cap barely binds.

Results are in [the backlog](../docs/archive/v1/balance-backlog.md#combat-rework-p1d-2026-10-31), G3 at 50 seeds:
- **The base:** only mono Sporeling fails G3 (81 / 84), and the strict counter bar passes. G4 fails at 28%
  Decisions.
- **Without the Mortar's clouds:** G4 has 23% Decisions; mono Sporeling 83 / 86 and Veilstalker's worst
  map (61) fail G3.
- **Both stall routes:** G4 has 18% Decisions (7 of 40 games, where 6 is the limit), and G3's Decisions are
  back to today's 7%. The strict bar passes with answers that win outright. Mono Sporeling (85 / 86) and
  mono Veilstalker (72 / 87) fail G3.
- Nothing passes G3, G4 and the strict bar, so P2's other checks weren't run.

## Combat rework P1c prototypes (2026-10-30)

**Nothing adopted; no shipped number, rule or default changed.** Two new default-off presets in
`src/data/proto.ts`, so goldens and hashes are unchanged:
- `cleave`: a Scythecap's swing hits every enemy unit within 1 tile of its target at full damage (1.2
  and 1.4 tiles by tier).
- `burster`: a new unit and spawner, the Burster and its Burster Pod (working names), which exist only
  under the preset. A Burster rolls at the thickest knot of enemy units and bursts on reaching it or on
  dying: 40 damage through any armor within 1.5 tiles, and a spore cloud (1.5 tiles, 4 s, 10 a second).
- The one data change is their sprites in `data/sprites/` (display only, never in battle state).
- `mixedwave` (and so `rework`) now needs 2 unit types, not 3: measured against 3, it helped `bot:balanced`
  more in G3 at 20 s and 17 s, the user's rule for choosing.

Results are in [the backlog](../docs/archive/v1/balance-backlog.md#combat-rework-p1c-2026-10-30):
- With the Burster on two-type `rework`, the strict counter bar passes at 15, 17 and 20 s on every map,
  Twin Roots included.
- G3 still fails at every beat: mono Sporeling 89% at 20 s, Gill Nest and Sporeling 63–68% at 17 s, Gill
  Nest 78% and the Rootbreaker on Twin Roots at 15 s.
- G4 fails at every beat on Decisions (30–48%). The Burster's burst and the Mortar's clouds are the main
  stallers.
- Removing the Elder Sporeling's splash lowers mono Sporeling by 9–18 points under waves.

## Combat rework P1b prototypes (2026-10-30)

**Nothing adopted; no shipped number, rule or default changed.** P1b applies the user's answers to P1's
questions, still as default-off presets in `src/data/proto.ts`, so goldens and hashes are unchanged:
- `waves`: spawners behind a lane's front spawner release early, so the wave passes the front door
  together on the beat; a hold lasts one beat, and the next beat always sends both waves.
- `sporecloud`: the Mortar aims each shell at the densest cluster of enemy units in range.
- `rhizomorph`: the Rhizomorph surfaces beside ranged units first and never where an enemy tower or
  Heartcap turret covers it (it falls back to the front).
- New `mixedwave` (with `waves`): a lane's wave of 3+ unit types sets out with shields of 20% of each
  unit's max HP. It helped the mixed army, so `rework` now turns on all six settings.
- The counter check's test bots carry `fixedWeights`, so the Rhizomorph's `aiWeight` skips them.

Results are in [the backlog](../docs/archive/v1/balance-backlog.md#combat-rework-p1b-2026-10-30). G3 at 50 seeds per seat:
- The five settings without `mixedwave`: mono Sporeling 96% mean / 99% worst, Gill Nest 68 / 79; no answer
  to mono Sporeling reaches 60%, even on the mean. G4 fails (8:42, 23% Decisions).
- `rework` (all six): Sporeling 95 / 98, Gill Nest 59 / 67; G4 passes (8:12, 15% Decisions, bot wins 43%).
- Without waves: Sporeling 77 / 83, Gill Nest 80 / 95; mono Sporeling's answers fail on Twin Roots (best
  45%), as on today's rules.
- The beat length trades archers for swarms. With 15 s and 17 s beats, `rework` is the first variant to pass the
  strict counter bar (every strong mono build has an answer ≥ 60% on every map), but G3 still fails (Gill Nest
  82 / 75, Sporeling 58 / 74) and G4's Decisions reach 28% / 20%.

## Combat rework P1 prototypes (2026-10-30)

**Nothing adopted; no shipped number, rule or default changed.** The combat rework's five settings
(`pinned`, `callforhelp`, `sporecloud`, `rhizomorph`, `waves`, and `rework` for all five) are presets in
`src/data/proto.ts`, absent from `balance.json`, so goldens and hashes are unchanged. The Rhizomorph and
its Rhizomorph Tunnel exist only under the `rhizomorph` preset; the one data change is their two sprites
in `data/sprites/` (display only, never in battle state). First numbers (G3 at 20 seeds per seat) are in
[the backlog](../docs/archive/v1/balance-backlog.md#combat-rework-p1-2026-10-30):
- `rework`: mono Gill Nest 74% mean / 83% worst (from 86 / 100), but mono Sporeling 94 / 98 and mono
  Veilstalker 63 / 90; G4 fails (8:51 median, 33% Decisions, bot wins 20%).
- `waves` alone makes swarms dominant (Sporeling 90 / 98); `pinned` is the only piece that moves the
  archers alone (75 / 93).

## Second-front test maps (2026-10-30)

**Nothing adopted; no shipped number, rule, map or default changed.** Four test-only maps in
`data/maps/` split the one-lane maps into two lanes, to measure whether a second front fixes G3 (mono
Gill Nest): `test-bogwater-2lane`, `test-stumpfield-2lane` and their `-tall` versions. They're
`testOnly`, so runs never draw them, and goldens and hashes are unchanged. Results are in
[the backlog](../docs/archive/v1/balance-backlog.md#second-front-two-lane-test-maps-2026-10-30).
- Two 4-row lanes, same plots: mono Gill Nest 80% / 85% (Bogwater / Stumpfield), from 100%.
- Two 6-row lanes (Twin Roots' shape): 62% / 67%, Twin Roots' own 63%.
- Every two-lane version: mono Amanita 58–73%, and mono Sporeling still 67–82%.

## G3 measures every map in the run pool (2026-10-30)

**Guardrail change, approved by the user** ("Keep G3 as proposed: mean ≤ 55%, worst map ≤ 60%, 50 seeds per seat."). **No content changed,
so no battle or golden changes.** `balance-targets.json` G3 goes from `seeds` 20 and `maxMonoWinRate` 0.55
(Bogwater Hollow only, 40 games) to `seeds` 50, `maxMeanWinRate` 0.55 and `maxMapWinRate` 0.60. Every
mono bot now plays `bot:balanced` on every run-pool map, 100 games per map, and must keep its mean
≤ 55% and its worst map ≤ 60% (SPEC §12.3).

Why: step A found the 40-game Bogwater check read mono Sporeling at 65% (75% over 100 games) and
missed every failure on other maps ([backlog](../docs/archive/v1/balance-backlog.md#g3-on-every-map-the-rewrite-2026-10-30)).

Result (`npm run test:slow`): **G3 fails for mono Gill Nest** (mean 88%, worst 100%), **mono Sporeling**
(74%, 77%) and **mono Amanita** (worst 64%, Twin Roots). Mono Morel passes exactly on the mean limit
(55%, worst 57%). Nothing was tuned to pass.

## Milestone 5: Armilla reworked, Rhizome Surge → Rhizome Tithe (2026-10-30)

**Content change, approved by the user** ("rework Armilla's content … and rerun the tournament").
Armilla's power was Rhizome Surge (take the frontier column in every lane, cooldown 100 s, first ready
1:30). It is now **Rhizome Tithe: +30 gold for every column held past home, cooldown 75 s, first ready
1:00.** Her core pool, starter kit and passive (capture +25%) are unchanged; the passive now feeds the
tithe. Rhizome Surge stays in the code as a power kind (tested on a test-only commander), so it can
come back as an alternate power (SPEC §9.5, mastery 3).

What was tried (whole runs, seeds 1–30, `bot:balanced`, power policy auto; Vesper and Cordis win 10/30):

| Armilla variant | Runs won | Battles won |
|---|---|---|
| As first specced (Surge) | 0/30 | 11/43 |
| Second spawner in the starter kit (Hammercap, Rootbreaker or Sporeling Burrow for the Mortar), power off | 0–1/30 | 13–20/44–50 |
| Surge + 40–80 gold per column taken | 1/30 | 14–16/45–46 |
| Second spawner + Surge + 40–80 gold per column | 0–2/30 | 16–23/44–51 |
| Tithe 20 / 30 / 40 per held column, Surge's timing | 4 / 3 / 6 of 30 | 40/69 · 35/62 · 54/78 |
| **Tithe 30, cooldown 75 s, first ready 1:00 (adopted)** | **7/30** | **54/77** |
| Tithe 30 or 40 that also takes the frontier (cooldown 75 s) | 7–8/60 | 87–88/143–144 |

On seeds 1–60 the adopted tithe wins 14/60 (23%), against Vesper 16/60 (27%) and Cordis 13/60 (22%).
A second spawner never helped: the Puffball Mortar is worth more to this bot than another army
building. Any version that still captures costs about 10 points.

Tournament (`npm run balance -- tournament --commanders all --seeds 30`): Vesper 10/30 (33%), Armilla
7/30 (23%), Cordis 10/30 (33%). **Spread 10 points, inside the 15-point target.** Battle 1 alone
(40 seeds): Armilla 30% without her power, 70% with it, the largest power swing of the three (Vesper
53% → 75%, Cordis 58% → 75%); worth watching in human playtests.

Goldens: `m5-armilla-power-s3` changes behavior; `m3-run-s7` and the other two M5 replays are
hash-only (the new `powerGold` counter). The §16 assert for Armilla is now `stats.player.powerGold>=1`.

## Milestone 5: commanders and powers (2026-10-29)

**New content at the SPEC's first-pass numbers; no existing number or rule changed.** Vesper, Armilla
and Cordis ship with the passives, powers, cooldowns and first-ready times of SPEC §11.10, unchanged:
no tuning in this entry moved the commander tournament inside its target, so none was kept (the
measurements are below and in [docs/archive/v1/m5-plan.md](../docs/archive/v1/m5-plan.md)).

Two harness changes affect what bots do, both only where they used to crash or never applied:

- **A bot's opener skips buildings missing from its kit.** Armilla's starter kit has no Sporeling
  Burrow, and `bot:balanced` opens with one; that used to throw. Generals keep the strict check.
  Single battles always field the whole roster, so no guardrail battle changes.
- **A bot player in a run gets weight 1 on its commander's core buildings that its profile never
  buys** (`botCoreWeights`, the same rule the run already uses for a general's run-only kit
  entries). `bot:balanced` never drafted or built Armilla's Hammercap Forge and Rhizome Vault or
  Cordis's Tender's Ring. Runs only; Vesper's core is all inside `bot:balanced`, so it is unchanged.

Run-golden change: `m3-run-s7` now plays with Vesper's passive and the powers flag on (the bot's power
policy stays `none` in that replay). The M1–M4 single-battle replays are hash-identical; three M5
replays pin each power under the auto policy.

Commander tournament (`npm run balance -- tournament --commanders all --seeds 30`, `bot:balanced`,
greedy drafts, random route, power policy auto):

| Commander | Runs won | Boss reached | Battles won | Power uses |
|---|---|---|---|---|
| Vesper | 10/30 (33%) | 12/30 | 62/82 | 355 (162,216 damage) |
| Armilla | 0/30 (0%) | 2/30 | 11/43 | 100 (129 columns) |
| Cordis | 10/30 (33%) | 11/30 | 59/80 | 273 (306 trios) |

Target: no commander more than 15 points above another. **Fails by 33 points** (Armilla; fixed by the
rework in the entry above). Within the
allowed levers (power and passive numbers), Armilla's best was 3/30 with her power and passive both
effectively off: in this sim, taking ground faster or instantly costs the bot battles. The fix needs a
content or rule decision; see [docs/archive/v1/m5-plan.md](../docs/archive/v1/m5-plan.md#the-commander-tournament).

## Adopted: E1 Hold / Advance (2026-10-28)

**Rule change, approved by the user.** The user asked for the prototypes that helped to go into the game,
and to leave out the ones that didn't. Only E1 qualified. `laneStance` (the `hold` preset: rally 1.5
tiles back, 30 s holds, 10 s cooldown, AI muster at 12 supply and release below 4) is now in
`balance.json`. Golden replays were refreshed. Two AI tests were adjusted: one now keeps its battle
alive past 7:00, the other looks across 10 seeds for the boss's Scythecap Grove (it's placed by 3:00
in 1–2 of 10 seeds with or without Hold). `--proto nohold` restores the old rules for comparison.

`npm run experiment` with checks g3, g4, g5, g7, boss and engagement:

| Check | Before (no Hold) | Hold (now shipped) | All nine prototypes together |
|---|---|---|---|
| First column flip | 2:16–4:14 | 0:34–1:29 | 0:34–1:42 |
| Player commands per minute | 1.3–1.4 | 2.1–2.6 | 1.7–2.1 |
| G3 mono Gill Nest | 100% ✗ | 100% ✗ | 100% ✗ |
| G3 other mono bots above 55% | none | Sporeling 65% ✗ | Sporeling 80% ✗ |
| G4 median / Decisions | 7:12 / 5% ✓ | 7:13 / 10% ✓ | 9:38 / 48% ✗ |
| G5 | 70% ✓ | 75% ✓ | 70% ✓ |
| G7 mirror / Slayer mirror | 58% / 50% ✓ | 60% / 56% ✗ | 61% / 56% ✗ |
| Runs reaching the boss | 25% | 11% | 41% |

- **Why Hold:** it is the one prototype that does its job. Battles open within the first 1:30
  instead of after 3:00, and players act about twice as often. Battle length stays in band.
- **Known costs, still open:** mono Sporeling now wins 65% (G3), G7's Slayer mirror reads 56%,
  and bot runs reach the boss less often (25% → 11%). Bots muster by rule; human players may use
  Hold differently. Re-measure after the first dev-site playtests.
- **The rest stay off:** B1, B3, B4, A2, A3 and T1–T3 stay as presets. All nine together keep
  archers at 100%, hand G3 to Sporelings and stall battles (`t3`).

## Engagement prototype E1: Hold / Advance (2026-10-28)

**Nothing adopted; no number, rule or default changed.** A per-lane Hold / Advance command (`laneStance`,
preset `hold`) with an AI muster policy, from recommendation 1 of the
[engagement review](../docs/archive/v1/engagement-review.md#prototype-e1-hold--advance-per-lane-2026-10-28). It is
absent from `balance.json`, so goldens and hashes are unchanged. `npm run experiment` gains two opt-in
checks, `engagement` and `runs`.
- **Opening:** the first column flip moves from 2:16–4:14 to 0:34–1:29, and battles with no flip
  before 3:00 drop from 30–83% to 0–3%.
- **G3:** mono Gill Nest stays at 93–100% under every variant. Mono Sporeling rises from 40% to
  55–78%, which is a new failure. Merging off doesn't change that.
- **Other guardrails:** G7's Slayer mirror fails at 56%, and G8 fails at 0 of 8 rows. G1, G2, G4,
  G5, G6 and G11 are as before.
- **Runs:** boss reach falls from 25% to 11–23%.

## Balance-backlog prototypes, round 2 (2026-10-27)

**Nothing adopted; no number, rule or default changed.** Measured on request: the Gill Nest spawn
interval (15 → 17–28 s, alone and with B1 or B3) and three new default-off prototypes for the
archers' opening tempo and the defender's trickle: T1 (`rangedFirstSpawnFraction`), T2 (`fallBack`,
a conditional variant of mustering) and T3 (`spawnerDefense`). Goldens and hashes are unchanged.
Results are in [the backlog](../docs/archive/v1/balance-backlog.md#round-2-results-2026-10-27).
- **Interval alone** never brings mono Gill Nest below 85%; at 28 s it is 90% and mono Sporeling and
  Amanita cross 55%. M1's "28 s reaches 50%" no longer holds on M4 content. G1 fails at every
  interval (Capguard Hall wins 7/8 pairings from 17 s on).
- **Interval 24 s + B1** reaches the G3 limit (55%), but mono Sporeling takes over (57%) and G4 (33%
  Decisions) and G7 fail.
- **T1** and **T2** leave mono Gill Nest at 100%; T2 also hands G3 to mono Sporeling (88%).
  **T3** gets mono Gill Nest to 30% only at 25 damage / range 7, where every reference battle ends
  by Decision and four other mono bots exceed 55%.
- **Diagnostic:** one-off defender bots (Sporeling- or Amanita-heavy, a two-Burrow opener, an
  adaptive `bot:balanced`, mono Sporeling) all lose 95–100% to mono Gill Nest, so G3 isn't a
  reference-bot artifact. `bot:balanced` is unchanged.

## Balance-backlog prototypes (2026-10-27)

**Nothing adopted; no number, rule or default changed.** B1 (Sporeling approach rush), B3 (firing
congestion), B4 (unit lifespan), A2 (counter floor weight) and A3 (an earlier first counter cycle)
were each prototyped behind a `balance.json` setting that is absent by default (A3 is the existing
`ai.counter.cycles`), and measured with the new `npm run experiment -- --proto <spec>`. Goldens and
hashes are unchanged. Results are in [the backlog](../docs/archive/v1/balance-backlog.md#prototype-results-2026-10-27).
- **G3:** mono Gill Nest stays at 98–100% under every candidate and combination, including B1 with
  `besiegedBy: melee`. B3 halves the archers' 60-supply margins, but these battles are decided
  before either army reaches that size.
- **B1** raises boss reach from 25% to 39% but fails G4 (25–28% Decisions at ×2–×3 for 1.5 s) and G7
  at every setting (mirror 52–56%, Slayer mirror up to 53%).
- **G8:** A2 lets the Baron field Scythecaps and Veilstalkers, and A2 + A3 passes the Capguard row,
  but the table still fails (at best 1 of 8 asserted rows).

## Milestone 4 (2026-10-27)

The adaptive general and intel (SPEC §7.4–7.8): five buildings, three units, four named generals and
the counter cycle. **No M1–M3 number, core rule or reference bot changed.** The structure commit was
behavior-neutral: 110 single battles and 10 whole runs gave identical fingerprints (winners, lengths,
spawns, merges, gold, damage, fronts), and the content commit left single battles identical too
(bots and the scripted general never buy the new buildings).

### New content: first-pass numbers and the two tuned units
- Hammercap Forge, Morel Warren, Rhizome Vault and Spore Exchange use the §11.2–11.3 numbers, except
  the Hammercap's damage (below). Upgrade tracks follow the §11.6 pattern.
- **Amanita Knight `hp` 700 → 500, `damage` 34 → 28.** At first-pass numbers it won every 12-supply
  duel (G2 FAIL: it lost to nothing, including the intended Hammercap > Amanita Knight edge) and mono
  Amanita Lodge beat `bot:balanced` 80% (G3 FAIL). At 520/30 mono Amanita was 58%.
- **Hammercap `damage` 22 → 25.** At 22 it lost the intended edge to the Knight 0/5; its value check
  was 1.28 per gold (target 1.45 ± 0.15), now 1.36.
- Result: G2 PASS with both M4 edges held 5/5 (Hammercap > Amanita Knight, Amanita Knight > Gill
  Archer; now asserted). G3 mono bots for the new spawners: Amanita Lodge 50%, Hammercap Forge 40%,
  Morel Warren 25%, Rhizome Vault and Spore Exchange 0%.
- The Morel Runner keeps its first-pass numbers. It is the only new candidate that could take the
  Gill Nest's production duel (G1, below), but that needs a cliff-edge buff (HP 95 and an interval of
  15 s) that makes mono Morel Warren beat `bot:balanced` 68%.

### Generals
- §11.11 openers and weights, except **the Blightwright opens with Rootbreaker Den + Truffle Cellar**
  (was Gill Archer Nest + Cellar) and its preferred list starts Capguard Hall, Gill Archer Nest. With
  the archer opener its run kit at battle 2 was archer-led and it won 25 of 27 run battles over 80
  runs; boss reach fell to 15% (main: 29%). Now the player wins 20 of 33 against it and boss reach is
  25% over 80 runs. Its single-battle weights are unchanged.
- Passives are the §7.7 ones (Mold's swarm buildings spawn interval ×0.91; the Baron's buildings
  HP ×1.2; the Blightwright's siege speed ×1.15; the Sovereign's turret damage ×1.25).
- The counter cycle uses the §7.4 numbers (×3 / ×0.6, ±0.03 noise, 2:00 → 4:00 and 5:00 → 7:00, boss
  1:00 → 3:00) and §7.6 (×2 / ×0.8 opening, ×2.5 dual, ½ / ½ intel). Counter sets hold spawners only.
  A harder lean (×5 / ×0.3) against the Lichen Baron fixed no failing G8 row (adaptive vs mono
  Sporeling 37% → 40%, mono Gill Nest 100%, mono Rootbreaker 70% → 63%) and pushed `bot:balanced`
  to the bottom of its band (57% → 47%), so the spec's numbers stay.

### Re-measure after M4 (G1, G3, G8)
- **G3 (mono Gill Nest): still 100%** against `bot:balanced` (40 games), unchanged by the Amanita
  Knight or the adaptive general. Every other mono bot is ≤ 50%. Still deferred (backlog B1–B4).
- **G1 now fails on the Gill Nest: it wins 7 of 8 production pairings (limit 80%).** It beat 5 of 6
  in M3; the three new spawners field Medium or Heavy units and all lose the production duel to
  massed archers (Lodge 0/6, Forge 0/6, Warren 0/6). Only the Sporeling Burrow beats it. Same root
  cause as G3, so it waits on the same decision.
- **G8 fails.** See `docs/archive/v1/m4-plan.md` (As built) for the table and the diagnosis.

## Review fixes (2026-10-27)

- A live building loses its full-refund entitlement when it first spawns units, earns gold, or
  fires. The 10 s grace period still covers unused placements, and deploy refunds remain 100%.
  This closes free-unit, free-income and free-shot placement/sale cycles. Normal refund relics
  still apply after production; units already spawned remain on the field.
- Run enemy kits now supply purchase weights for progression buildings absent from the original
  general profile. The boss can buy its seventh building (Scythecap Grove), so upgrades on that
  track are useful. Historical single-battle profiles and all unit/building numbers are unchanged.
- Compared 40 single battles (seeds 1–20 on Bogwater Hollow and Twin Roots) with the pre-fix build:
  identical gameplay fingerprints, including results, duration, spawns, damage, income and fronts.
  The slow suite still passes G1, G2, G4, G5, G6, G7 and G11; G3 still fails at 100% mono Gill Nest.
- Golden replay hashes were refreshed because `BuildingState.hasProduced` is now part of the
  deterministic state. M1/M2 replays have hash-only changes. M3 seed 7 also changes actual boss
  behavior: its first three battles retain their outcomes and lengths, but the boss now wins by
  Rout at tick 8102, where it previously lost at tick 6757. This difficulty change is the intended
  consequence of fixing the unusable boss kit; it is not an archer rebalance.
- Archer-balance candidates are recorded in [the solutions backlog](../docs/archive/v1/balance-backlog.md).
  No candidate is implemented by these fixes.

## Milestone 3 (2026-10-26)

The run loop: drafts, upgrade tracks (SPEC §11.6), 21 relics (§11.7 plus five new ones), events, the
Grove, Tender's Ring and two maps. **No M1 or M2 number changed.** 90 reference battles (bot:balanced
vs scripted ×40, the merge mirror ×20, mono Gill Nest ×20, comeback-6 ×10) give identical winners,
lengths, spawns, merges, gold, damage and front lines before and after M3; the golden updates in this
milestone are hash-only for single battles.

### New content, first-pass numbers
- Tender's Ring (180 gold, 450 HP, 1 Tender / 20 s) and the Tender (90 HP, heals 8 HP / 1 s, range
  2.5; Bloomed +0.5 range, Elder heals 2 targets): the spec's numbers. Mono Tender's Ring wins 3% vs
  `bot:balanced` (a healer can't fight alone). G1/G2 leave support spawners out of the combat duels.
- Upgrade tracks follow §11.6; the M2/M3 buildings use the same pattern (survivability → damage →
  signature). Relics follow §11.7; the five new ones are Hardy Spores, Root Stipend, Mending Moss,
  Bloom Vigor and Martyr's Bloom. Mycorrhizal Link's "15% faster" is spawn interval ×0.87.
- Draft constants (`draft` in balance.json) and the general's kit growth (`enemyKit`, §7.8) are the
  spec's numbers.

### Reference bots: unchanged (Tender's Ring tried and reverted)
Adding Tender's Ring at weight 1 to `bot:balanced` and its three twins reshuffled the bots' picks and
broke two guardrails that pass today: G4 Decisions 18% (limit 15%; win rate 53% → 45%, median 7:12 →
8:08) and the G7 mirror 54.5% over 200 games (floor 55%). The Slayer clause read 48% (limit 50%).
The reference bots keep their M2 weights, so G4 and G7 measure what they did before M3.

### Re-measure after M3 (G3, G7)
- `npm run test:slow`: only G3 fails, as before M3 (G1, G2, G4, G5, G6, G7, G11 pass).
- G3 with drafts on for both sides (greedy picks, Vesper's pool): mono Gill Nest **100%** vs
  `bot:balanced`; every other mono bot ≤ 38%. Drafts, upgrades and relics don't move archer spam.
- G3 against `bot:balanced` + Tender's Ring: mono Gill Nest still **100%**.
- G7 with Tender's Ring in the reference bots: mirror 54.5%, Slayer mirror 48.0% (above).

### Runs (SPEC §16 Milestone 3, verification 2)
`npm run sim -- --run --seeds 1..20 --player bot:balanced --auto-draft greedy --auto-route random`:
- With the kickoff stand-in (scripted general, full 8-building roster every battle) 10% of runs
  reached the boss: the player opens with a 3-building starter kit against 8 buildings and is routed
  in battle 1 in 12 of 20 runs.
- With §7.8 kit growth pulled into M3 (user's decision): **25%** of runs reach the boss on seeds 1–20
  and **29%** over 80 seeds (target ≥ 30%). Every run completes. Runs that reach the boss fight 4–5
  battles with 24–37 min of battle (inside both bands); runs that end early in defeat fight fewer
  (median 3 battles, 21.6 min), so "4–5 battles per run" and "22–38 min per run" hold only for runs
  that reach the boss. Early defeats are mostly battle-1 routs by the general's Sporeling swarm
  (opener Burrow + Cellar with merging) and elite battles.

### Twin Roots (SPEC §16 Milestone 3, verification 3)
`--map twin-roots --seeds 1..20 --flags merging`: median 7:50 (in the G4 band), 10% Decisions, but
lanes diverge (front midpoints ≥ 4 columns apart at some sample) in only **35%** of battles (target
≥ 50%; 53% on seeds 21–60). Four layouts (more stumps in each side's weak lane, extra loam) moved it
by at most 10 points: both AIs send new spawners to whichever lane is losing, which keeps the fronts
level. The original layout is kept; the lever is the AI's lane choice (§7.3), not the map.

## Milestone 2 (2026-10-25)

Merging (SPEC §5.5–5.6), Scythecap Grove and Veilstalker Hollow. Merging is on by default from M2
(feature flags follow the milestone); M1 golden replays pin `merging: false` and the M1 roster, and a
66-battle behaviour fingerprint confirmed M1 play is bit-identical with merging off.

### Scythecap (first-pass numbers kept)
G1: the Grove wins 2/5 pairings. G2: beats Sporeling and Veilstalker, loses to Gill Archer; the
intended edge Scythecap > Sporeling holds 5/5.

### Veilstalker and the slayer multiplier
First-pass Veilstalker (110 HP, 18 pierce, 1 per 16 s, slayer ×1.75) was ~1.7× the M1 units' value
per supply (§11.4: 42 vs 23–29) and 0.8× per gold (1.19 vs 1.45): it won every 12-supply duel
(G2 FAIL: loses to nothing) and no production pairing (G1 FAIL). Cutting it to a normal per-supply
value made it lose the intended edge to Bloomed Capguards (0/5): a Bloomed Capguard hits Light for
52.5 and soaks split fire, so square-law estimates overrate swarms of small slayers. The slayer
multiplier therefore carries the counter (picked from a sweep of 14 variants):
- Veilstalker `hp` 110 → **80**, `damage` 18 → **12**; Veilstalker Hollow spawns **2 per 18 s**
  (was 1 per 16 s).
- `tagMult.slayerVsElite` 1.75 → **3.0**; the Elder Veilstalker perk `slayerMult` 2.0 → **3.4** (it
  keeps its bump over the base multiplier).
Result: G1 PASS (the Hollow wins 1/5 pairings), G2 PASS. The Veilstalker beats Sporeling, Gill
Archer, Rootbreaker and every Bloomed unit but the Scythecap; base Capguards and Scythecaps (Slash vs
Light) beat it. So merging your Capguards opens a weakness to Slayers, and the answer to Slayers is
unmerged line troops. Value check: 6.67/min × sqrt(80 × 10.9) × 1.2 / 160 = 1.48 per gold.

### Reference bots
- `bot:balanced` builds the whole roster: + Scythecap Grove 2, Veilstalker Hollow 1. With the M1 mix
  and merging on, G4 had 19–20% Decisions and G5 was 74–80%; with the new mix G4 is median 8:17,
  13% Decisions, G5 64–70%.
- New G7 bots: `balanced-nomerge`, `slayer` (+Veilstalker Hollow 8: a 23–25% realised Slayer share)
  and `slayer-nomerge`.

### G3 (mono Gill Nest) after M2: unchanged
Mono Gill Nest still wins 100% against `bot:balanced` with merging on, with both the M1 reference
mix and the full-roster mix. Every other mono bot, including the new ones, stays ≤ 48% (mono
Scythecap Grove 15–20%, mono Veilstalker Hollow 3–8%). Still deferred (see Milestone 1).

### G7 (merging's edge): `tierStatMult` 2.5 → 2.8
G7 compares each bot with its own merge-off twin, both seats, so the merge toggle is the only
difference. (The second clause, "against an opponent with a 25% Slayer share", is measured as a
Slayer mirror: pitting merge-on against a different, Slayer-heavy bot mixed roster strength into the
result, since Slayer-heavy armies are weaker overall: merge-off `balanced` beats them 58–63%.)
- At ×2.5 merging was a near-neutral sidegrade in bot play: merge-on won 48% of the reference mirror
  over 120 games (target 55–70%). A Bloomed unit had ~83% of its parts' HP and damage (§5.5) and paid
  off mainly when the 60-supply cap bound, which bot armies rarely reach. Slayer mirror: 39–48%.
- Single-knob sweep of the reference mirror (120 games each): `tierStatMult` 2.7 → 51%, 2.8 → 56%,
  3.0 → 58%; knit 0.5 s → 54%; merge radius 2.0 → 51%; combat cooldown 1.0 s → 48%; supply cap
  45 → 48%. Only the stat multiplier reached the band.
- **`tierStatMult` 2.5 → 2.8** (user's decision, 2026-10-26). A Bloomed unit now has ~93% of its
  parts' HP and damage for ⅔ of their supply. Over 200 games: reference mirror **58%**, Slayer mirror
  **50%** (Slayers now neutralise merging rather than punish it; that clause sits on its threshold).
- G7 `seeds` 20 → **100**: at 40 games the standard error (~8 points) is wider than the effects G7
  measures, so the verdict flipped between runs.
- Knock-on checks at ×2.8: G1, G2 (every intended edge held), G4, G5, G6 and G11 still pass.

## Milestone 1 (2026-10-25)

### Territory capture
- `captureSeconds` 3.0 → **2.0**, `captureDecayMult` 2 → **0.5**.
  Units only *walk through* their own frontier column on the way to mid-field fights, so with 2×
  decay a column almost never flipped behind an advancing army; the side being pushed back
  (whose units fight next to its own border) gained ground instead. Baseline over 40 seeds
  (balanced vs scripted): median 9:11, 35% Decisions. After: median 7:37, 13% Decisions, and fronts
  follow the winning army.

### Units and buildings (G1 production duels, G2 supply duels)
Baseline: G1 failed (Sporeling Burrow won no pairing; Capguard Hall and Gill Nest never lost clearly)
and G2 failed (Rootbreaker beat every unit; Gill Archer beat none).
- Sporeling `hp` 60 → **72** (archers now need 6 hits, not 5), `speed` 1.3 → **1.5**.
- Capguard `speed` 0.9 → **0.75** (more time under Gill Archer fire).
- Gill Archer `hp` 90 → **110** (Capguards now need 6 hits, not 5). Damage kept at 14: at 15 an
  archer kills a Sporeling in 4 hits and Sporeling > Gill Archer collapses.
- Rootbreaker `hp` 520 → **460**, `damage` 30 → **28** (still ×2 siege, ×1.5 crush vs structure).
- Rootbreaker Den spawn `interval` 24 → **20** s.
Result: G1 PASS; G2 PASS with every intended §11.4 edge held in 4–5 of 5 seeds
(Capguard > Sporeling, Gill Archer > Capguard, Sporeling > Gill Archer, Gill Archer > Rootbreaker,
Capguard > Rootbreaker, Rootbreaker > Sporeling).
Value check (§11.4, sanity only): Burrow 1.71, Capguard 1.48, Gill 1.53, Rootbreaker 1.56.

### Heartcap turrets and the Sporestorm (G4 length, G5 snowball, G6 comeback)
- Turret `range` 7 → **9**. Ranged units sieged home-front buildings from outside turret reach
  (archers stand ~9 tiles from the Heartcap edge), which made early leads self-reinforcing:
  G5 (+150 gold) was 83–88%. After: 68%.
- Sporestorm `startSeconds` 300 → **240**, `heartcapTakenPerStack` 0.10 → **0.20**, to keep battle
  length in band after the stronger turrets. G4: median 8:02, 13% Decisions, bot wins 48%.

### Moved into data (values unchanged)
- `loamBonus` 0.5 and the §7.2–7.3 AI heuristics (pressure window, threat radius, situational
  multipliers and placement score weights) now live in `balance.json`.

### Open: G3 (mono Gill Nest)
`script:mono:gillNest` wins ~100% against `script:balanced` (target ≤ 55%). Not fixed by data: range
4.5 → 3, damage down to 6, HP, aggro, speed, supply, turret reach 9–10, stronger Mortars, Burrow batch
size and several reference-bot mixes all leave it at 78–100%; only a near-halving of Gill Nest output
(interval 15 → 28 s) reaches 50%, and every such nerf breaks G1 (Capguard Hall then never loses) and
pushes mono Capguard above 55%. Mechanism: ranged units win every trickle skirmish, never trade, and
accumulate to the supply cap, while a mixed army never fields its counter (Sporelings) in bulk.
Raised with the user as a rules question.

**Diagnosis** (instrumented mono Gill Nest vs `script:balanced`, all prototypes reverted):
- Production suppression: archers besiege home-front buildings from x≈22.7, just outside turret
  reach 9 (x ≥ 23). The defender's spawners are besieged 36% of the time and ~7 buildings fall per
  battle, so it fields ~50 units per battle against archer spam versus ~220 against Capguard spam.
  Turrets still kill most archers (42 of 62 per battle); the defending army kills few.
- Trickle fights: every building spawns on its own timer, so defenders walk out one or two at a
  time and die in their own half 5–10 s after spawning. Melee crossing ~5 tiles under fire from two
  or more archers dies before it swings.
- Archers are the only reliable way to break a defended home: nerfing the Gill Nest enough to matter
  (interval 22–24 s) stalls G4 (median ~9:40, 30–50% Decisions).
- Counters that are narrow at 12 supply become blowouts at 60 (Lanchester square law: every archer
  fires, only the front melee row swings). Supply-duel margins at 60 supply each: Sporeling > Gill
  Archer +8, Gill Archer > Capguard +39, Gill Archer > Rootbreaker +46, Capguard > Sporeling +40,
  Capguard > Rootbreaker +8, Rootbreaker > Sporeling +30. For a uniform mix to hold against every
  mono strategy, Sporeling > Gill Archer must be the largest margin (c = a + b, a = d + e, f = b + e
  with a = Ga>Ca, b = Ga>Ro, c = Sp>Ga, d = Ca>Sp, e = Ca>Ro, f = Ro>Sp); today it is the smallest.

**Prototypes that helped but did not fix it:**
- Mustering (units wait at their own frontier until ≥ 8 supply has gathered or 15 s pass, then
  march together; a change to §5.2 "units always advance"): G4 median 6:11–6:49 with 0–10%
  Decisions, G5 ~50–60%. Mono Gill Nest stays 85–100%, mono Rootbreaker rises to 50–100%.
- A per-unit damage-type resistance (not in the data model yet): Sporeling Pierce ×0.6 lifts
  Sporeling > Gill Archer to +31 at 60 supply; Capguard ×0.75 and Rootbreaker ×0.7 Pierce cut Gill
  Archer's wins to +19 and +33. Capguard > Sporeling stays +40. Best combination with mustering:
  mono Gill Nest 85–90%.

**No effect on G3:** Capguard or Rootbreaker resistance alone, heavy-armor Capguard, a cleave unit,
turret reach 10–12, turret damage type or splash, ranged damage falloff, archer pinning,
synchronised spawns, slash Mortar, balanced-bot mixes and openers, AI threat radius, and a head
start (+600 gold for the balanced bot reaches only 45%).

**Decision (2026-10-25): deferred.** The user chose not to change rules or rebalance yet, to see how
Milestone 2 (Scythecap Grove, Veilstalker Hollow, merging) changes the picture. Until then G3 is a
known failure in `npm run test:slow`. When it is picked up, the recommended order is: mustering (needs
the user's OK, as it changes §5.2), then a per-unit resistance field and an army-scale (60 supply)
check in G2, with G3 as the acceptance test.
