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

- **Title screen and wordmark (A4).** "Spore & Sprawl" in the display face, with Continue, New run, How to play and Settings over a Heartcap silhouette and drifting spores. It later becomes the door to the Underroot (M6). `scene=run` keeps its behavior for tests.
- **Route as a mycelium map (C1).** Nodes become spore-pod tokens on soil, joined by hyphae drawn as SVG threads (every node links to every node in the next row). The path you've taken glows, future threads stay dim, and hovering a node lights its threads. Add a node legend.
- **Draft and spoils cards (C3).** Each rarity gets a frame: common is bark, uncommon is teal-lit, rare is amber-lit with a spore sparkle. A type icon sits in the header, blueprints show stat chips (cost, output, role) instead of prose, cards deal in staggered with a hover lift, and keys 1–3 show as keycaps.
- **Event and Grove (C2).** A vignette layout: a framed 4× scene, text on a stalk-cream panel, and choices as cards with outcome chips (+gold, −Heartcap, intel) in signal colors.
- **Report and summary (C4).** An outcome banner (on a win the Heartcap blooms in lilac spores; on a loss the cap wilts to ash), a staged reveal (banner, then front line, then bars) and an MVP-building callout. Every table stays.
- **Run bar (C5).** Icons for Heartcap, Spores and Amber, relics as pixel badges with tooltips, and the seed moved to the footer.
- **Help (C6).** Four tabs (Matrix · Merging · The general · Keys) that fit at 720.

### Phase 3: Feel (M)

- **Sound (A5).** Done ahead of Phase 1 (decision 3, SPEC §13.9): battle and UI sounds, a dripping-cave ambient bed, master/effects/ambience volume and mute, saved through `storageKey()`. The Phase 3 settings screen still gets the volume sliders.
- **Motion (A6).** A spore-burst wipe between screens (≤400 ms), roll-up counters for rewards and a restrained hover tilt on draft cards. The duration and easing tokens are in the design system README.
- **Settings screen (SPEC §10.5).** Volume, reduced motion, screen shake, damage numbers, UI scale and color-blind assist.
- Align M8's spawn and death puffs with the spore particle.

### Phase 4: Verify (S, after each phase)

- Run `npm run screenshot` on every screen at 1280×720, 1366×650 and 1920×1080, plus `--filter deuteranopia|protanopia`.
- Contrast: text at least 4.5:1, control borders and focus rings at least 3:1 (the pairs are in the design system).
- Playtest questions: Does it feel like a fungal world? Can you tell what you can afford at a glance? Did you know where you could place? Did the route feel like a journey?

## Decisions (2026-10-28)

1. **Fonts:** self-host Jersey 10 and Atkinson Hyperlegible. Import them from `styles.css` so Vite bundles them with hashed, relative paths (`base: './'`), which works the same on the game and the dev site. No runtime requests to Google; OFL license files ship beside them.
2. **New art:** text sprites, like the existing ones. Big pieces (roots ceiling, soil bed) are small tiling strips. Preview sheets get reviewed before they're wired in.
3. **Sound:** done, ahead of Phase 1. Sounds are synthesized with WebAudio from parameters in `data/sounds.json`, the way sprites are text-defined, with no audio files (SPEC §13.9; audition them at `?scene=sounds`). Specific sounds can switch to CC0 samples later if the synthesized set feels thin.
4. **Order:** the battle screen before the run screens. The run screens still get Phase 0's fonts, icons and borders for free.

Build order: Phase 0, then sound, then Phase 1 (split into the field frame and the HUD/tray/deploy work), then a playtest on the dev site. Phase 2 comes after that. Each step is a PR into `develop`. Phase 0 (PR #12), sound (PR #13) and Phase 1a, the field frame (PR #14), are merged; Phase 1b, the HUD, deploy, tray and controls, is built (2026-10-29). The frame's preview sheet was approved on 2026-10-29, crowns included, and so was the `i-settings` cog, Phase 1b's one new sprite.

## Research notes

- **Route maps.** Slay the Spire's map works because the whole act is visible from the start, every node type has its own icon, and a legend that highlights node types supports planning backwards from the boss ([untapped.gg guide](https://sts2.untapped.gg/en/guides/how-to-make-the-best-map-choices-in-slay-the-spire-2), [TouchArcade review](https://toucharcade.com/2020/06/15/slay-the-spire-ios-review-iphone-ipad-performance-icloud-megacrit-humble-games/)). A sequel mod that colors nodes by type suggests players want that ([mod](https://sts2.gg/mods/mod-475)).
- **Card readability.** Mechabellum players ask for stats on hover before picking random units ([Steam thread](https://steamcommunity.com/app/669330/discussions/1/4413047708760795073)). Thronefall's reviewers single out a minimal HUD where every unit and building reads instantly ([Gameluster](https://gameluster.com/thronefall-review-holding-on-for-one-last-night/), [Siliconera](https://www.siliconera.com/review-thronefall-is-a-beautifully-simplistic-rts-game/)).
- **Pixel UI craft.** Build on an 8 or 16px grid so scaling stays crisp, show state with a one-pixel bevel (pressed inverts it, disabled removes it), use nine-slice panels, and segment bars for at-a-glance reading ([Wayline: bars, meters and panels](https://www.wayline.io/learn/game-ui-art/3), [Coherent Labs on nine-slice](https://guide.coherent-labs.com/layout-assets-and-styling/graphics--shapes/advanced-ui-shapes/)).
- **Fonts.** Roundups recommend Pixelify Sans for small sizes ([Figma](https://www.figma.com/fonts/pixelify-sans/)) and Tiny5 for dense readouts ([1001 Fonts](https://www.1001fonts.com/tiny5-font.html)). I rendered Pixelify Sans, Silkscreen, Jersey 10, Tiny5 and VT323 at 16–40px on `panel-2`. Pixelify's 5 and Tiny5's 9 are ambiguous at HUD sizes, and Silkscreen is caps-only and wide. Jersey 10 has the clearest digits and a compact, game-like headline.
- **Game feel.** Balatro layers card motion, rolling counters, shake scaled to magnitude, particles and audio on every scoring event ([Blake Crosley's breakdown](https://blakecrosley.com/guides/design/balatro)). That's the model for Phase 3, turned down for a strategy game.
- **Fungal mood.** Bioluminescent dark-palette mushroom sets ([Mycelium tileset](https://val-demar.itch.io/mycelium)), the "cozy, magical and warm" brief behind Ravensburger's Mycelia ([Toy Book](https://toybook.com/ravensburger-mycelia-launch/)), and Hollow Knight's spore-hung Fungal Wastes ([Team Cherry](https://www.teamcherry.com.au/blog/backer-ghosts-fungal-wastes-front-page-of-reddit)) all point toward the same thing: dark ground, glowing life, drifting spores.
