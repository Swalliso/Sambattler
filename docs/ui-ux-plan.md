# UI/UX review and plan

Review date 2026-10-28, against `main` at 96f2c4f (M4 plus PR #10). I went through every screen at 1280×720 (SPEC's minimum) and 1920×1080 with Playwright: route, deploy, battle at 2:00 and 5:00, two lanes, placing, card tooltip, help, draft, report, event, Grove and run summary. I also read `src/ui`, `src/render`, `styles.css`, the sprite data and the playtest notes. The visual language this plan proposes lives in the [Spore & Sprawl design system](https://claude.ai/artifact/F43BuArPBRt8QueTz9zUCU) (tokens, type, ten components, all 45 sprites). It's private until shared from the page's Share menu.

Nothing here touches `src/sim`, so none of it changes golden hashes or balance.

## What already works (keep it)

- **The sprites.** They're text-defined, share one palette, and the buildings read as mushroom architecture. Everything else should be built to match them.
- **Crisp rendering.** The field uses integer pixel scaling, and the HUD is DOM, so text stays sharp and Playwright can query it (SPEC §10.1).
- **Faction identity.** The Velvet Bloom (violet) and the Gray Rot (ash-green) carry texture as well as color: violet squiggles against grass tufts on the territory.
- **Information depth.** Card tooltips with matchups, the front-line graph, the callout priority lane, coin pops and the intent countdown.
- **Text contrast.** Body text is 12.4:1 on cards and muted text is 5.9:1. The problems below are about identity and layout, not legibility of sentences.

## Findings

Severity: **H** hurts first impressions or play, **M** is a clear gap, **L** is polish.

### A. Identity: it reads as a web dashboard, not a fungal game

| # | Finding | Sev |
|---|---|---|
| A1 | The sprites are fungal but the frame around them isn't. Every surface is a flat rectangle with a 1px `#3b3046` border, a 3–6px radius and a system font. | H |
| A2 | `ui-sans-serif, system-ui…` everywhere: the game looks different on each OS, and there's no display face or wordmark. | H |
| A3 | Icons are Unicode glyphs (◆ ● ⧗ ☁ ♥ ›). They render in the OS symbol font, clash with the pixel sprites and vary by platform. | M |
| A4 | There's no front door. The game boots straight into The Route; "Growing the mycelium…" is the only flavor text. SPEC §10.5 lists a Title screen. The favicon is a two-shape mushroom. | H |
| A5 | No audio at all. | M |
| A6 | Outside the battlefield almost nothing moves, and every screen change is a hard cut. | M |

### B. Battle screen

| # | Finding | Sev |
|---|---|---|
| B1 | **About a third of the screen is empty void.** The map is a wide strip, so width caps the integer scale: 1152×256 (2×) at 1280×720 leaves ~130px empty above and ~90px below; at 1920×1080, 1728×384 (3×) leaves ~215px above and below. Height can't go to the field, so it should go to framing. | H |
| B2 | **The tray overflows.** With 14 buildings (the single-battle kit, or a late run with 9+), card 9 is clipped at 1280 and the rest need horizontal scrolling. Names wrap to two lines, and sprites draw at 32px (1×), so a building is a smudge. With 3 cards (battle 1), each card stretches to ~260px of mostly empty space. | H |
| B3 | Unaffordable cards drop to 45% opacity, so the name and price fade exactly when the player needs to read "how much more?". | M |
| B4 | In deploy, Begin and its hint sit in the middle of the field where buildings go, and the placement ghost's tooltip collides with them. Legal tiles aren't highlighted while placing, so you only learn legality by hovering. | M |
| B5 | Heartcap HP is the win condition, but it's two small pills at the field's corners, while gold, supply and wave get equal weight up top. | M |
| B6 | Control borders are 1.24:1 (`#3b3046` on `#2a2133`), so buttons and cards blur into their panels. WCAG asks 3:1 for control boundaries. | M |
| B7 | Role tags and kit badges are 10px, under SPEC §10.4's 12px floor. | L |
| B8 | The left column mixes speed, pause, Hold/Advance, Help and "Numbers" as identical buttons with no grouping. The empty inspect panel is a wall of hotkey text. | L |
| B9 | The factions differ by hue far more than lightness (violet vs rot is 1.38:1). Territory textures carry the difference today; units carry it only through cap color. Check this in the M7 color-blind pass, and consider a team-tinted ground shadow under units. | L |

### C. Run screens

| # | Finding | Sev |
|---|---|---|
| C1 | **The route reads as a table, not a journey**: boxes in columns joined by "›", no paths, and past and future shown by opacity alone. | H |
| C2 | **Event and Grove screens are ~75% empty**: a 48px icon, a paragraph and two plain buttons. Choices don't show their costs and gains visually. | H |
| C3 | On draft and spoils cards, rarity is a word plus a 1px tinted border, and the type (Blueprint/Relic/Upgrade) is a muted word. There's no card frame, reveal or hover lift, and blueprint stats are prose. | M |
| C4 | The report and summary are dense tables with a colored word for the outcome, so a win or loss has no moment. The data is good: keep it and stage it. | M |
| C5 | Run bar: Spores and Amber are words without icons, relics are text chips, and the seed sits in a prime spot. | L |
| C6 | Help doesn't fit at 720: hotkeys are clipped below the fold, and key cells wrap ("Right-click / Esc" takes three lines). | M |

### D. Layout and platform

| # | Finding | Sev |
|---|---|---|
| D1 | `#app` has `min-width: 1280px; min-height: 720px` with `body { overflow: hidden }`. In a 1366×768 laptop browser (~650px viewport) the bottom band is cut off and can't scroll. | M |
| D2 | `styles.css` has 30+ hex values outside `:root` (`#3d2a57`, `#7a3a33`, `#ffb4a8`, `#ffd27a`, `#b8862f`…), so restyling means hunting. | M |
| D3 | There's no designed focus ring. Tray cards take keyboard focus (for tooltips) but show the browser default. | L |

## Direction: lit from below

The world is under the roots, in the dark, and the colony glows. Six rules decide where the theme goes:

1. **The UI is part of the colony.** Containers are grown, not drawn: bark-and-cap frames, gill-line dividers, cream stalk tones. Use this on containers only, never on every row.
2. **Bioluminescence is the interaction language.** What you can act on glows lilac (foxfire), what the enemy owns is ash, and gold means money and nothing else. Hover glows; selected glows and lifts; disabled is unlit (desaturated, not transparent).
3. **Mycelium connects.** Lines between related things are hyphae: route paths, the tug bar, the territory frontier.
4. **Spores are the particle.** One ambient particle system everywhere: drifting spores on menus, thicker during the Sporestorm, bursts on placing, merging and winning.
5. **Pixel display, clean text.** Use a pixel face for titles, numbers and short labels at 16px and up, and a highly legible sans for sentences.
6. **Clean field, rich frame.** The battlefield stays uncluttered (SPEC §10.4). Decoration lives in the frame and the void.

Off limits: mushroom-shaped buttons for every control, textures behind text, emoji, and any theme that costs legibility.

## Plan

Each phase is one feature branch from `develop`, playtested on the dev site. No phase touches the sim.

### Phase 0: Foundations (S–M, mostly invisible)

- **Tokens.** Move every color into CSS custom properties named as in the design system, and delete the stray hex values (D2). Existing names stay (`--bg`, `--panel`, `--violet`…).
- **Type.** Self-host Jersey 10 (display: titles and numbers at 20px and up) and Atkinson Hyperlegible (text) as subset woff2 files (both OFL, together under ~60 KB). Add type-scale classes. This replaces A2. Pixelify Sans was tried first and rejected because its 5 reads as an 8 at HUD sizes ("150" looks like "180").
- **Pixel icons.** Add `i-gold`, `i-supply`, `i-wave`, `i-storm`, `i-heart`, `i-spores`, `i-amber`, `i-hold`, `i-advance`, `i-pause` to `data/sprites/ui.json`, draw them through the existing atlas, and drop the Unicode glyphs (A3).
- **Floors.** Role tags go to 12px (B7). Control borders use `line-strong` at 3:1 or better (B6). Add a 2px solid lilac focus ring (D3), and honor `prefers-reduced-motion` from the start.
- **UI scale.** Scale the whole app to fit windows down to about 1024×600, instead of clipping (D1).
- *Done when:* `npm run verify` and the browser tests pass, screenshots match today's layout, and the design system's contrast pairs hold.

### Phase 1: Battle screen (L)

- **Frame the field (B1). Built in Phase 1a (2026-10-29).** A roots ceiling sits above the field (tree roots diving out of the earth, hanging rootlets) and a soil bed below it (strata, pebbles, buried hyphae: lilac under your half, ash tufts under theirs). Roots run down each side, and each Heartcap's crown rises into the ceiling (render-only; the in-field Heartcap is unchanged).
  - It's tiling text sprites in `data/sprites/frame.json`: `f-ceiling` 288×64, `f-bed` 192×48, `f-hyphae` and `f-hyphae-rot` 192×48, `f-earth` and `f-side` 32×32, and `f-crown` 64×36.
  - `src/render/frame.ts` bakes them once per layout onto one canvas behind the field and the bands, from the top band down to the bottom band. It draws at the field's own pixel scale (fractional too) with its pixels lined up with the field's, and a near-black earth tile fills whatever the strips don't reach, so no gap shows at any window. Soft light pools glow at the buried knots and above each Heartcap.
  - The art stays darker than the field's soil, and the frame takes no input (`pointer-events: none`).
- **Ambient spores.** Built in Phase 1a. Spore-white motes, 1–2 native pixels, drift slowly upward on a second canvas behind the field, so they show only in the void. Their density follows `state.sporestorm` (about 24 at 1280×720, plus about 21 per stack). They move at the game's speed and stop while the battle is paused, held for a draft or over. They hold still under `prefers-reduced-motion` and `?test=1`. One seeded pool, no allocations per frame, and no redraw when nothing moved. Test: `tests/browser/frame.test.ts`.
- **Regroup the HUD (B5). Built in Phase 1b (2026-10-29).** The top band is [your Heartcap] [stat chips over the territory tug] [their Heartcap] [the General's Intent].
  - Each Heartcap shows its cap sprite (`heartcap-cap`, 1×), HP in the display face at 30 px and a striped bar that drains toward the field's centre; under a third, the number turns danger red. The in-field HP pills are gone, so the crowns stand alone in the ceiling.
  - Gold, supply, wave and storm are icon chips with tabular Jersey 10 numerals and a small word. The storm chip lights lilac once the storm is on.
  - The tug has one bar per lane (`--cols` draws a tick per column), stripes for each side and a glowing lilac line at your frontier, with column counts under its ends.
  - The intent panel's portrait is 48 px (3×). A counter warning shows the kind, one pip per wave left and the countdown; the pips and the count pulse, and hold still under reduced motion.
- **Deploy (B4). Built in Phase 1b.** Begin is the primary button at the top of the bottom band's controls (Jersey 10 at 30 px, lilac glow, an `Enter` keycap). Once the battle is live, the speed control takes its place.
  - The deploy hint, "Paused" and the save-recovery notice are pinned callouts in the callout lane, so nothing sits on the field. A callout pops in once; reordering the lane no longer replays the animation.
  - While placing, your legal tiles get a lilac wash and grid (`Session.legalTiles()` from the sim's `legalPlacements`, minus pending placements, cached on the board). An illegal hover keeps its reason.
  - The ghost tip sits beside the footprint inside the field (right, or left near the right edge, centred and clamped vertically), so it never covers the ghost, a band or the lane.
- **Tray (B2, B3). Built in Phase 1b.** A cap-shaped band in the role's colour (its lower edge curved like a cap's rim) replaces the left stripe; sprites draw at 2× (64 px); the price is a gold chip; the summary takes at most two lines in a fixed slot, so names, tags and summaries line up along the tray.
  - Unaffordable is unlit: the sprite desaturates, the price turns danger red, and the summary becomes a gold-deep bar filling toward the price with "need N". The name stays readable, and nothing fades.
  - Cards are 88–108 px wide however few there are, so three cards don't stretch. When the cards don't fit one row, `Tray.fit()` switches to **compact**: two rows with the sprite at 1× beside the key and price, then the name, the role and the summary on one line each. At 1280×720 that happens from 10 cards; at 1920×1080, 14 cards fit one row. Hotkeys are unchanged.
  - The Spore Exchange's summary is now "interest cap +10" (its +1 gold is in the tooltip), and summaries keep a number with its unit (non-breaking spaces).
- **Controls (B8). Built in Phase 1b.** Speed and pause are one segmented control. Hold/Advance is a two-icon switch per lane (`i-hold`, `i-advance`), the lit one being the stance, with the state and timer beside it; a hold on cooldown is unlit.
  - "Numbers" moved to a settings popover beside the speaker: a new `i-settings` cog (preview sheet approved 2026-10-29) opens Off / Big hits / All, saved under the same settings key. A press outside or Escape closes it.
  - The empty inspect panel shows a two-line tip.
  - Bands: top 100 px, bottom 204 px. The field keeps 8 px of margin instead of 20 px now that nothing is pinned to its edges, so height-limited maps lose little (Twin Roots at 1280×720 draws at 1.78×, was 1.91×; Bogwater Hollow is unchanged at 2×).
- *Done when:* screenshots at 1280×720 and 1920×1080 have no clipped cards with 14 buildings, the battle-1 economy tip still fires, and the browser tests pass. Met: `tests/browser/hud.test.ts` checks the tray at 1280×720, 1366×650 and 1920×1080, unlit cards, Begin and the pinned callouts, the legal grid, the ghost tip, the settings popover and the economy tip.

### Phase 2: Run screens (L)

Built 2026-10-29 (branch `feature/run-screens`). The sprite preview sheet and rough title, route and draft screenshots were approved on 2026-10-29. New art is text sprites in `data/sprites/run.json`: pods `p-pod` (28×28) and `p-pod-boss` (34×34), each in three frames (unlit, lit, taken); `i-blueprint`; rarity corners `fr-common`, `fr-uncommon` and `fr-rare` (12×12), and `fr-sparkle`; relic badges `r-common`, `r-uncommon` and `r-rare`; nine 48×36 vignettes (`v-<event id>` and `v-grove`); the title silhouette `t-heartcap` (112×84); and the wilted cap `hc-wilt`. `i-elite` and `i-boss` were redrawn so they no longer read alike.

- **Title screen and wordmark (A4). Built.** With no `scene` the page opens on the title (`src/ui/screens/title.ts`): "Spore & Sprawl" in Jersey 10 at 96 px beside the Heartcap's silhouette at the largest integer scale that fits, over a lilac light pool, with spores drifting across the screen.
  - Continue shows only with a saved run and names its row and Heartcap. New run asks first if a run is saved. How to play opens Help. Settings opens the settings popover (`settingsControl` with a label, opening sideways) with the sound sliders (`soundPanel`) above the damage numbers.
  - `scene=run` keeps today's behaviour (resume or start, no title), so the tests and tools are unaffected; battle parameters without a scene still open a single battle. The route and the summary have a Title button back.
  - The spores reuse the battle's drift: `src/render/spores.ts` (`SporeDrift`, `sporeLayer`) now holds the pool that `FieldFrame` used, unchanged, and `FieldFrame` draws through it.
- **Route as a mycelium map (C1). Built.** Rows run left to right in a grid; each node is a spore pod at 2× with its 16 px icon at 2×, on a soil light pool. SVG hyphae (`hyphae()` in `src/ui/screens/run.ts`) are drawn after layout from the pods' centres and redrawn on resize: from the colony's start to the first row, and from every node to every node in the next.
  - The path you walked is violet with a glow, the threads into the open row are lilac, past threads fade to `panel-2`, and future ones stay `mat-violet`. Hovering or focusing a pod lights its own threads.
  - Open pods glow and are the only ones you can click; past rows drop to 50%. The legend in the footer names the five kinds and the two lit thread styles. The boss pod has ash thorns, not gold (gold means money).
- **Draft and spoils cards (C3). Built** (`src/ui/cards.ts`, shared by the battle's draft and spoils).
  - Each card has a 2 px edge in its rarity's line colour, with mirrored corner sprites: bark for common (a new `--bark` token, 4.1:1), teal-lit for uncommon, and amber-lit with two twinkling sparkles for rare. Rare and uncommon glow amber and teal (`--glow-amber`, `--glow-teal`), not money gold. The rarity keeps its word.
  - The header holds the type's icon and word. Art is 64 px: the building at 2×, or for a relic its rarity badge at 4×. A blueprint shows its description, then chips for its price, output and role; an upgrade shows "Level N of 3".
  - `1`–`3` are keycaps, and spoils take the keys too. Cards deal in 80 ms apart, growing from 0.96, and lift 4 px on hover.
- **Event and Grove (C2). Built.** A vignette layout: the scene at 4× in a framed, lit box; the story on stalk cream; the choices as cards with keycaps. Outcome chips are read from each choice's outcome data (`outcomeChips`): gains in sprout, costs in danger-soft with a real minus, gold in gold, notes (the Sporestorm shift) in warn, each with a word and, mostly, an icon. A choice you can't take is unlit, with the reason. Prompts use the same panel.
- **Report and summary (C4). Built.** An outcome banner: on a win the Heartcap at 2× blooms with lilac spores rising; on a loss the cap wilts to ash, with ash drifting down (both `sporeLayer`). The MVP building callout sits beside it: the top damage dealer (turrets aside), with its count and share.
  - The staged reveal: the banner, then the front line (+320 ms), then the bars (+640 ms), each growing in. Every table stays.
  - To fit 720, the front line's bands are shorter (104 px for one lane), and the summary lays out damage, cards and earnings in three columns. Play again and Continue are primary buttons. The battle report takes the atlas as a new fourth argument, a one-line change in `BattleView`.
- **Run bar (C5). Built.** The Heartcap's HP in the display face with a striped bar, Spores and Amber with their icons and display numerals, battles won, the kit at 2× with upgrade levels, and relics as 32 px badges with a tooltip on hover or keyboard focus. The seed moved to the footer of every run screen.
- **Help (C6). Built.** Four tabs (Matrix · Merging · The general · Keys) in a fixed 470 px body, so the dialog fits 1280×720 on every tab. Arrow keys move between tabs, and the last tab opened is remembered. The matrix cells say "strong" and "weak" as words; the general's tab lists the four kinds; keys are keycaps, with alternatives as separate caps ("`Right-click` / `Esc`").
- **Spores on every run screen.** A faint drift sits behind each run screen, as on the title (rule 4).
- **Link preview.** Not in the original plan; the user asked for it on 2026-10-29. `index.html` has Open Graph and Twitter card tags. `vite.config.ts` fills in the absolute address per build: the game, or `/dev/` with "(dev)" in the title. `public/og-image.png` (1200×630) is rendered from the title by `npm run og-image`.
- **Motion.** Under `prefers-reduced-motion` there is no stagger, lift, sparkle or drift, and fades take 120 ms. `?test=1` adds `html.still`, which holds every deal-in, reveal and twinkle.
- *Done when:* met. `tests/browser/runScreens.test.ts` covers:
  - the title with and without a save, and Continue;
  - the route's thread count and its hover;
  - spoils keys;
  - event chips with a real minus;
  - the Grove's unlit Graft;
  - Help's tabs fitting at 720;
  - no clipping at 1280×720 or 1366×650.
  `npm run screenshot` checks the title. Screenshots at 1280×720, 1366×650 and 1920×1080 are in `artifacts/screenshots/phase2/` (gitignored).

### Phase 3: Feel (M)

Built 2026-10-29 (branch `feature/feel-settings`). No new sprites: the settings screen uses the existing icons, and the color-blind marks are drawn in code like the tier pips. Rough settings screenshots from the title and from battle went to the user on 2026-10-29. The user approved them the same day and asked for the color-blind preview in the empty right column.

- **Sound (A5).** Done ahead of Phase 1 (decision 3, SPEC §13.9). The settings screen holds the same mute and sliders; the speakers keep their quick mute.
- **Settings screen (SPEC §10.5). Built** (`src/ui/settingsScreen.ts`, replacing Phase 1b's popover, `settingsControl.ts`).
  - It opens from the title's Settings button, the battle's cog (the battle pauses, and the sheet says so) and a new cog beside the run bar's speaker. Esc, Close or a press on the scrim closes it; keys reach nothing behind it except `S`, and Tab stays inside.
  - Sound: mute and three sliders. Battle: damage numbers (moved out of the popover; `#numbers [data-numbers]` kept), default speed (each battle runs at it once it begins) and screen shake. Display and motion: UI scale (Auto, 125%, 150%, 175%, 200%; a step never lays the page out below 1280×720), reduced motion (System, On, Off) and color-blind assist.
  - Under the assist sits a live preview (`#assist-preview`, `src/render/assistPreview.ts`): a strip of field at 3×, the Bloom's mat and two units on the left and the Rot's on the right, over a territory bar, captioned "Your units" and "Gray Rot units". It is drawn with the renderer's own mat tiles, team marks and sprites (`matTile`, `teamMark`), so it redraws with the marks and bolder textures the moment the assist turns on.
  - Every field is in the one record, `spore-sprawl/settings/v1`, through `storageKey()`. Older records load with the new fields at their defaults, and unknown values fall back (`loadSettings`). `onSettings()` tells the page and the battle what changed, so scale, motion, assist and damage numbers apply at once.
  - Save export/import and a profile reset wait for the profile (M6); the sheet says so.
- **Motion (A6). Built** (`src/ui/motion.ts`).
  - *Spore-burst wipe* between screens (title, route, spoils, event, Grove, prompt, summary, battle, the battle's report, Play again): a veil of the void rises over the old screen on a band of spore-white motes (150 ms, ease-in), the screen swaps, and the veil lifts off the new one from the bottom up (210 ms, ease-out), 360 ms in all. It is the spore particle (`SporeVeil` in `src/render/spores.ts`, same motes and alpha steps as the drift). Clicks and keys wait while it runs. The page's first screen appears at once. The in-battle draft, which opens over a field that stays, gets a burst of spores alone.
  - *Roll-up counters:* the report's banner now names what the battle earned (gold; in a run, Spores and any Amber, with an elite's Amber shown as a chance), and those, the gold-by-source bars and the summary's Spores, Amber and Commander XP roll up from 0 (600 ms, ease-out) and bump once.
  - *Hover tilt:* draft and spoils cards lean toward the pointer, at most 3° and 4°, on top of the 4 px lift.
  - *Reduced motion* is now a setting: System follows `prefers-reduced-motion`, On and Off override it. It is the `reduce-motion` class on `<html>` (the old media query moved under it), and the spore drift reads the same class. It drops wipes, tilt, roll-ups, drift and shake, and keeps fades at 120 ms (a screen change fades in over 120 ms). `?test=1` makes every change instant and every counter final.
- **Screen shake. Built, off by default** (SPEC §10.4): a jolt of the field when a Heartcap is hit, up to 3 screen px by damage, 180 ms, at most once every 1.5 s per Heartcap, never under reduced motion or `?test=1`. It didn't drag in other M8 work.
- **Color-blind assist (B9). Built.** The deuteranopia and protanopia screenshots came first. They showed the units' caps already differ (blue against gray under both filters) and the mats differ in pattern, but the factions are close in lightness, and units carried their side only by cap color. The assist adds:
  - a team mark under every unit's feet that peeks out either side of the sprite: a light lilac ring for the Velvet Bloom, a dark bar with pale dashes for the Gray Rot, so the sides differ in shape and lightness;
  - bolder mats: the Bloom's strands in its light glow color, the Rot's replaced by dark ash tufts with pale tips;
  - a leaning hatch on the Gray Rot's half of the territory bar.
- **Puffs.** The renderer's spawn and death puffs (stalk squares and lilac or ash rings) are now spore-white motes, 1–2 px, drifting up and fading. The Sporestorm's specks on the field are spore-white too.
- *Done when:* met. `tests/browser/settings.test.ts` covers each setting saving and surviving a reload, old and malformed records loading, Esc and Tab, the run bar's cog, UI scale (and the battle refitting), reduced motion, the assist, default speed, the wipe, reduced motion's fade and the roll-ups. `tests/browser/hud.test.ts` checks that the cog pauses the battle until Esc, and `tests/unit/settings.test.ts` checks the record's migration. The resume tests use reduced motion, since their persisted runs need `debug=1` rather than `test=1`.

### Phase 4: Verify

Done 2026-10-29, after Phase 3. `npm run screenshot` gained `--size`, `--click` (to open the settings screen or a Help tab) and `--settings` (to stage a setting such as the assist), and checks the settings screen when a click opened it.

- **Screenshots.** Every screen at 1280×720, 1366×650 and 1920×1080 (the settings screens again after the preview went in, with the assist off and on). Through `npm run screenshot`: title, title with settings, route (start, mid-run, near the boss, with settings), draft, battle (deploy, mid, mid with the assist, two lanes, Sporestorm, counter warning, with settings), report (win and loss), summary (win and loss) and the four Help tabs. The title's Continue, spoils, an event and the Grove need a saved run, so the Playwright script from Phase 2 took those. With the color-vision filters: battle mid (assist off and on), two lanes and the route, under deuteranopia and protanopia, at 1280×720 and 1920×1080. 82 `npm run screenshot` captures, all passing (one failed while the dev server was reloading mid-run and passed again on its own). The shots are in `artifacts/screenshots/phase4/` (gitignored).
- **Fixed during the check:**
  - The battle report overflowed 1280×720 by 17 px, so its buttons scrolled. That was already true in Phase 2. Table rows lost a pixel of padding and the front line's band is 96 px (was 104), so the report now fits with nothing to scroll.
  - The Abandon run button's resting edge was `danger-line`, 1.8:1 on the panel. It is `danger` now (5:1).
  - A plain lit `.btn.on` had a `violet` edge on `panel-selected`, 2.5:1. It is `lilac` now (6.1:1), as the segmented controls already were.
  - A card you can't afford, picked for placing, put its `danger` price on `panel-selected` at 3.7:1. That price turns `danger-soft` (7.4:1).
- **Contrast.** `tests/unit/contrast.test.ts` reads the tokens from `styles.css` and checks 58 pairs the UI uses: every text pair at 4.5:1 or better and every control edge and the focus ring at 3:1 or better. All pass. The tightest are `danger` on `panel-2` (4.50:1, used at 20 px and up) and `violet` on `panel-2` (3.07:1, territory and bars, never text).
- **Accepted exceptions:**
  - `line` (1.24:1 on `panel-2`) stays a decorative divider and is never a control's only edge.
  - `danger-line` still edges bad callouts and cost chips, which are status, not controls; their text is `danger-soft`, 9:1.
  - Under the deuteranopia and protanopia filters the faction hues stay close in lightness. With the assist off, the sides still read by cap color, which survives both filters, by mat pattern and by which side of the field they hold. With it on, shape and lightness carry them too.
  - At 1920×1080 the run screens keep their 960–1180 px columns, so the sides stay empty, as in Phase 2.
- **Playtest questions** (for the dev site): Does it feel like a fungal world? Can you tell what you can afford at a glance? Did you know where you could place? Did the route feel like a journey? And now: does the wipe feel quick, and does anything in the settings need explaining?

## Decisions (2026-10-28)

1. **Fonts:** self-host Jersey 10 and Atkinson Hyperlegible. Import them from `styles.css` so Vite bundles them with hashed, relative paths (`base: './'`), which works the same on the game and the dev site. No runtime requests to Google; OFL license files ship beside them.
2. **New art:** text sprites, like the existing ones. Big pieces (roots ceiling, soil bed) are small tiling strips. Preview sheets get reviewed before they're wired in.
3. **Sound:** done, ahead of Phase 1. Sounds are synthesized with WebAudio from parameters in `data/sounds.json`, the way sprites are text-defined, with no audio files (SPEC §13.9; audition them at `?scene=sounds`). Specific sounds can switch to CC0 samples later if the synthesized set feels thin.
4. **Order:** the battle screen before the run screens. The run screens still get Phase 0's fonts, icons and borders for free.

Build order: Phase 0, then sound, then Phase 1 (split into the field frame and the HUD/tray/deploy work), then a playtest on the dev site. Phase 2 comes after that. Each step is a PR into `develop`. Phase 0 (PR #12), sound (PR #13), Phase 1a, the field frame (PR #14), and Phase 1b, the HUD, deploy, tray and controls (PR #15), are merged. The frame's preview sheet was approved on 2026-10-29, crowns included, and so was the `i-settings` cog, Phase 1b's one new sprite. Phase 2, the run screens, was built on 2026-10-29, after its sprite sheet and rough screens were approved the same day, and released to `main` with the earlier phases (PR #17). Phase 3 (motion, the settings screen, the color-blind assist and spore puffs) and the Phase 4 check were built on 2026-10-29 on `feature/feel-settings`. That finishes the plan.

## Research notes

- **Route maps.** Slay the Spire's map works because the whole act is visible from the start, every node type has its own icon, and a legend that highlights node types supports planning backwards from the boss ([untapped.gg guide](https://sts2.untapped.gg/en/guides/how-to-make-the-best-map-choices-in-slay-the-spire-2), [TouchArcade review](https://toucharcade.com/2020/06/15/slay-the-spire-ios-review-iphone-ipad-performance-icloud-megacrit-humble-games/)). A sequel mod that colors nodes by type suggests players want that ([mod](https://sts2.gg/mods/mod-475)).
- **Card readability.** Mechabellum players ask for stats on hover before picking random units ([Steam thread](https://steamcommunity.com/app/669330/discussions/1/4413047708760795073)). Thronefall's reviewers single out a minimal HUD where every unit and building reads instantly ([Gameluster](https://gameluster.com/thronefall-review-holding-on-for-one-last-night/), [Siliconera](https://www.siliconera.com/review-thronefall-is-a-beautifully-simplistic-rts-game/)).
- **Pixel UI craft.** Build on an 8 or 16px grid so scaling stays crisp, show state with a one-pixel bevel (pressed inverts it, disabled removes it), use nine-slice panels, and segment bars for at-a-glance reading ([Wayline: bars, meters and panels](https://www.wayline.io/learn/game-ui-art/3), [Coherent Labs on nine-slice](https://guide.coherent-labs.com/layout-assets-and-styling/graphics--shapes/advanced-ui-shapes/)).
- **Fonts.** Roundups recommend Pixelify Sans for small sizes ([Figma](https://www.figma.com/fonts/pixelify-sans/)) and Tiny5 for dense readouts ([1001 Fonts](https://www.1001fonts.com/tiny5-font.html)). I rendered Pixelify Sans, Silkscreen, Jersey 10, Tiny5 and VT323 at 16–40px on `panel-2`. Pixelify's 5 and Tiny5's 9 are ambiguous at HUD sizes, and Silkscreen is caps-only and wide. Jersey 10 has the clearest digits and a compact, game-like headline.
- **Game feel.** Balatro layers card motion, rolling counters, shake scaled to magnitude, particles and audio on every scoring event ([Blake Crosley's breakdown](https://blakecrosley.com/guides/design/balatro)). That's the model for Phase 3, turned down for a strategy game.
- **Fungal mood.** Bioluminescent dark-palette mushroom sets ([Mycelium tileset](https://val-demar.itch.io/mycelium)), the "cozy, magical and warm" brief behind Ravensburger's Mycelia ([Toy Book](https://toybook.com/ravensburger-mycelia-launch/)), and Hollow Knight's spore-hung Fungal Wastes ([Team Cherry](https://www.teamcherry.com.au/blog/backer-ghosts-fungal-wastes-front-page-of-reddit)) all point toward the same thing: dark ground, glowing life, drifting spores.
