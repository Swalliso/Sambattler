# After the combat rework: the evidence

> **Archived: v1 era.** Written before [SPEC v2](../../../../../SPEC.md) (2026-10-31), for a battle v2 retires. Read it as history and evidence, not as current rules, numbers or plans ([the archive](../../../README.md)).

The working files behind [After the combat rework](../after-the-rework.md), the review of `develop` at `ef2e133` written on 2026-10-31 before the P3 playtest of `?proto=rework`. Read that page first: it holds the conclusions, the critics' final verdicts (its Appendix A) and the suggested order of work. **Nothing here is adopted.**

Agents wrote these files during the review. Read them as evidence, not decisions:
- the numbers come from bots;
- the playthroughs are agents driving the real dev site;
- statuses are as of `ef2e133`.

## What's here

| File | What it is |
|---|---|
| [ledger.md](ledger.md) | Every earlier fun recommendation (about 155, from the engagement review to F16), with its status and evidence, the user's standing decisions, and the problems nothing built or planned answers. The page's IDs (ER-2c, F11 …) point here |
| [measurements.md](measurements.md) | Headless runs of M5 rules, `rework`, and `rework` with step B's prototypes: 720 single battles and 600 runs per variant, plus who's-winning time series and placement spread |
| [rework-state.md](rework-state.md) | What `?proto=rework` changes, piece by piece, its roster, its measured checks and known issues, and a P4 decision tree |
| [run-loop.md](run-loop.md) | The run as a player meets it: every decision, an audit of the drafts, relics and upgrades, commanders, the difficulty curve and meta-progression |
| [battle-feel.md](battle-feel.md) | The verbs, what the field shows and hides, feedback and sound, and what the game teaches about the rework |
| [playthrough-newcomer.md](playthrough-newcomer.md) | An agent playing two runs as a newcomer on the dev site |
| [playthrough-strategist.md](playthrough-strategist.md) | An agent probing for depth: mixed against mono armies, flyers, Hold against the beat, the general's warnings |
| [research-lane-battlers.md](../../../../research/research-lane-battlers.md) | Lane tug-of-war and real-time army games, with 23 mechanics to borrow |
| [research-autobattler-roguelites.md](../../../../research/research-autobattler-roguelites.md) | Auto-battlers and builder roguelites: build expression and run variety |
| [research-one-more-run-and-feel.md](../../../../research/research-one-more-run-and-feel.md) | Why players start another run, game feel, comebacks, readability and onboarding, from designers' own talks |
| [proposals/](proposals/README.md) | The five lenses' 48 proposals (the battle, builds, the run, feel, opposition) and a critic's review of each |
| [screenshots/](screenshots/README.md) | 20 screenshots from the playthroughs and the battle-feel pass, each saying what it shows |
| [scripts/](scripts/README.md) | The measurement and playtest scripts, as reference copies with how to run them |

## How these files were kept

The session's scratch folder was wiped before they were committed. Each file was rebuilt by replaying the agents' own writes from the session's transcripts, and checked:
- the ledger came back byte-identical to the copy committed earlier;
- the reports match the sizes and lines seen before the wipe;
- the scripts match the copies their agents printed.

Two things were lost:
- **raw experiment outputs**, marked "(raw output not kept)" where cited. The scripts regenerate them under the gitignored `reports/`;
- **screenshots an agent didn't view during the session**, marked "(not kept)".

## Related

- [Status](../../../../status.md): where things stand and what waits on the user.
- [The combat rework](../combat-rework.md), and its [P3 questions](../combat-rework.md#p3-playtest).
- Earlier reviews: the [engagement review](../../engagement-review.md), the [One More Run review](../one-more-run-review.md) and the [external design review](../one-more-run-design-review.md) it checked.
