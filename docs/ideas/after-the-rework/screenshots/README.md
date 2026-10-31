# Screenshots from the after-the-rework review

Screenshots for [After the combat rework](../../after-the-rework.md) (2026-10-31, `develop` at `ef2e133`, the dev site with `?proto=rework`). They were recovered from the session transcript, so only images an agent viewed survived; these 20 were picked for follow-up work, and the reports mark every other screenshot they mention "(not kept)". Nothing here is adopted.

- **newcomer/** and **strategist/** come from the two agent playthroughs, at 1440×900 with `&debug=1` (some show the F3 overlay's numbers).
- **battle-feel/** comes from the battle-feel review's captures of bot battles (`&scene=battle`): full screens at 1280×720, the SPEC minimum, and crops of the field canvas at 2×.

## newcomer/ ([playthrough-newcomer.md](../playthrough-newcomer.md))

- [`07-beat-tooltip.png`](newcomer/07-beat-tooltip.png): deploy in battle 1 against Old Mother Mold: the beat chip's "Next wave" tooltip (waves, mixed-wave shields, the storm's growth, Hold), beside the "Wave 0 · 0:00" chip. Used by the newcomer report and [rework-state.md](../rework-state.md).
- [`23-b1-0113.png`](newcomer/23-b1-0113.png): 1:13 in battle 1: the Hold label cut to "Keeping the …", with "+2" units waiting inside each spawner. Used by the newcomer report.
- [`29-b1-0202.png`](newcomer/29-b1-0202.png): 2:00 in battle 1: three callouts at once (the general's "2 waves" warning, the draft tip, "Mixed wave: shields up") over the first draft, which holds the battle; two of its three cards are +15% HP. Used by the newcomer report.
- [`33-b1-burst.png`](newcomer/33-b1-burst.png): 2:13 in battle 1: "Wave 3 · 2:13" beside the beat chip "7s +5" and the general's "2 waves" (60 s waves); "Spore Burst hit 3 targets!" with the effect barely visible; "+2" on all four of Mold's Burrows. Used by the newcomer report and [rework-state.md](../rework-state.md).
- [`38b-cloud-zoom.png`](newcomer/38b-cloud-zoom.png): zoom at 3:08: an enemy Burster's cloud, a pale glow the newcomer couldn't tie to a side (compare [`rw-burst-5000-crop0.png`](battle-feel/rw-burst-5000-crop0.png)). Used by the newcomer report and [rework-state.md](../rework-state.md).
- [`66-b1-0850.png`](newcomer/66-b1-0850.png): 8:53 in battle 1, storm 5: Mold's merged, shielded wave inside the base, 0/60 supply, the Heartcap at 1524 and falling, "Truffle Cellar lost" and "Sporeling Burrow lost". Used by the newcomer report.
- [`68-b1-report.png`](newcomer/68-b1-report.png): the battle 1 report, a Rout at 8:56: the front line ahead from about 1:30, then a cliff; Mold "countered" a swarm with Sporeling Burrows; 171 Bloomed and 38 Elders against 68 and 9; all 10 of the newcomer's buildings lost and none of Mold's. Used by the newcomer report.
- [`69-after-b1.png`](newcomer/69-after-b1.png): the run summary after that loss: "The run ends after 1 battle", 0 Spores, 0 Amber, 0 Commander XP, "Feats: none yet (Milestone 6)" and "Every run starts fresh". Used by the newcomer report.
- [`82-r2b1-0400.png`](newcomer/82-r2b1-0400.png): run 2, battle 1 (the Lichen Baron) at 4:00: red "Column 18 lost" and "Column 19 lost" for neutral columns never held, next to "now counters your SWARM", over a draft that holds the battle. Used by the newcomer report.
- [`130-b2-report.png`](newcomer/130-b2-report.png): run 2, battle 2 report (a win against Mold on Twin Roots): 1,290 gold earned, but the player's gold-by-source rows add up to 890, with no row for relic gold (the newcomer's Spore Tithe). Used by the newcomer report.
- [`159-b4-0400-territory-paradox.png`](newcomer/159-b4-0400-territory-paradox.png): run 2, battle 4 (the Blightwright) at 4:00: the bar reads 7 columns to 9 against the newcomer while the enemy has no buildings or units left and its Heartcap is at 988; the 10th and 11th tray cards have no hotkey. Used by the newcomer report.

## strategist/ ([playthrough-strategist.md](../playthrough-strategist.md))

All four are from run 1's battle 1, Twin Roots against Old Mother Mold, which the strategist lost by Rout at 7:47.

- [`b1_t407.png`](strategist/b1_t407.png): 4:07: the bar reads 15 columns to 8 for the strategist with a full Heartcap, while "+2" badges sit on Mold's Burrows; lane 1's Hold label is cut to "Keeping th…". No report links it: the strategist's 4:07 row cites `b1_power3.png` (not kept).
- [`b1_t709.png`](strategist/b1_t709.png): 7:08: 27 columns to 13 and the Heartcap at 3000/3000, 39 s before the Rout. Used by the strategist report.
- [`b1_t741.png`](strategist/b1_t741.png): 7:41: "Capguard Hall lost" and "Truffle Cellar lost", 0/60 supply and the Heartcap at 2448, while the bar still reads 27 to 14. Used by the strategist report.
- [`b1_end.png`](strategist/b1_end.png): that battle's report: the front line per lane; 468 units spawned to the strategist's 177; 124 Bloomed and 20 Elders to 27 and 0; 11 of the strategist's buildings lost and none of Mold's; 277 comeback gold paid to the winner. Used by the strategist report.

## battle-feel/ ([battle-feel.md](../battle-feel.md))

`rw-mold-*` is seed 7, `bot:balanced` against Old Mother Mold; the other two are seed 3 against the scripted general.

- [`rw-mold-3m00.png`](battle-feel/rw-mold-3m00.png): 3:00 at 1280×720: the chips row overflows, so the relics chip ("0 ↑ 0 R") overlaps "GRAY ROT HEARTCAP"; the 17-card tray cuts off prices; Rich Loam out-contrasts the units. Used by the battle-feel report.
- [`rw-mono-rhizo-2m-crop0.png`](battle-feel/rw-mono-rhizo-2m-crop0.png): 2:05, `bot:mono:rhizomorphTunnel`, field at 2×: two tunnelling Rhizomorphs, brown mounds on brown soil the size and colour of a stump. Used by the battle-feel report.
- [`rw-burst-5000-crop0.png`](battle-feel/rw-burst-5000-crop0.png): 4:10, `bot:mono:bursterPod`, field at 2×: the player's Burster clouds, tinted lilac by owner (compare [`38b-cloud-zoom.png`](newcomer/38b-cloud-zoom.png), the Gray Rot's). Used by the battle-feel report.
- [`rw-mold-7m00-crop0.png`](battle-feel/rw-mold-7m00-crop0.png): 7:00, field at 2×: a clump at the enemy's buildings that can't be counted, under overlapping "BLOOMED!" labels from both sides, on the busy Rot mat. Used by the battle-feel report.
- [`rw-mold-finale-9330.png`](battle-feel/rw-mold-finale-9330.png): 7:46 at 1280×720, about 3 s before the end: the enemy Heartcap at 953 with its buildings gone, while the bar still gives the Gray Rot 11 columns and the callout lane says "Bloomed Sporeling!". The battle-feel report describes this moment in §2.5 and its summary but doesn't name the file.
