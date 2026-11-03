# The "last fielded" view as a variant

**Status:** not adopted. R2a's playtest gate (2026-11-03) kept the full reveal as the default (R2-Q1's A/B), and the user suggested this view "might work as an optional difficulty setting or some variant mode or something down the line".

**Touches:** SPEC §1.3 #3 and §7.5 (what you see of the general), §15.6 (the `reveal` parameter), and a variant or difficulty setting, which no milestone plans yet.

## What it is

From round 2, the general's colony and squads are drawn as it fielded them last round, and this round's plantings appear only at Begin, with their sprout. The Intent panel says "Changes show at Begin". It's a view rule: the general's plan and the sim are the same as with the full reveal, so no hash and no golden moves. R2a S19 built it for the A/B, behind `?scene=rounds&reveal=last` (T127).

## What the A/B found (measured: one player, two battles)

- The user preferred the full reveal: "I still prefer to see the general's army planning/placing units/structures before I make my move", and "I think the default should be to be reacting to your opponent".
- With `reveal=last`, rounds read less as "plan, then fight": "Rounds read as plan then fight for the most part except for the `reveal` mode".
- Both battles were won by Rout, in rounds 5 and 6, with a median of 20 s and 6 s of planning a round ([playtest-feedback.md](../playtest-feedback.md#2026-11-03-r2as-playtest-gate-a-battle-in-rounds-the-user)). Two battles say nothing about difficulty.

## Why it might come back (a guess)

- **As a harder setting:** you'd no longer move last with the general's counters in view, which is the cost R2-Q1 named for the full reveal (§7.5, A198). X7's `bot:answer` could measure how much harder.
- **As a variant mode** beside the default.

## Before it could ship

- **S19's four gaps** (`docs/r2a-plan.md`'s As built, "For S21 and R2b"): a click on a plot holding a hidden building still opens its details; a sold building that's drawn again can't be inspected; the empty-lane warning reads the live formation; and `tools/screenshot.ts`'s assertion 4 fails a `reveal=last` capture from round 2.
- **A setting in place of the URL parameter,** shown before a run starts.
