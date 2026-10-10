# Design system: "operations console" (D52)

Owner vision: opening GOSIP shows the whole Earth as a real satellite globe, like Google Earth, inside a government-intelligence-style console. You turn on a layer (fires, quakes…) and every record appears on the planet; you can fly from orbit down to street level. It must never look like a cheap landing page. This supersedes the "night chart" flat-map system (D47).

Screenshots in `docs/screenshots/globe/` use stand-in development data and the bundled offline imagery (the build sandbox cannot reach satellite tiles). Never publish stand-in data.

## Principles

1. **The globe is the product.** It fills the console behind everything. Panels float over it as glass; never push the globe below the fold on desktop. Phones: globe on top (~62% of the screen), panels flow below.
2. **Instrument chrome, honest status.** Mono uppercase labels, hairline rules, corner brackets, a live UTC clock and a "Feeds n/m nominal/degraded" indicator. The green classification-style banner states the truth: unclassified, open-source public data, not an emergency service. Never fake classification, agencies or seals.
3. **Colour is data or status.** Chrome is ice-on-void. Saturated colour belongs only to data marks (magnitude ramp, hazard kinds, heat cells) and to status (`--signal` nominal, `--caution` stale, `--alarm` failure, `--lab` simulation).
4. **One encoding everywhere.** `src/state/encoding.ts` drives globe marks, static map, legend, layer glyphs and feed cards. Never pick a mark colour inside a component.
5. **Honest modes.** NVG/IR are labelled visual filters, not sensor data. "NASA today" names its actual date. Night lights are a 2016 composite. Feed-only layers (no coordinates) are never placed on the globe.
6. **One ambient motion.** The live dot breathes and last-hour quakes pulse; both stop under reduced motion. Camera flights only answer a user action (feed selection, Show on map, Home).

## Tokens (`src/styles.css` `:root`)

| Token | Value | Use |
| --- | --- | --- |
| `--void` | `#020507` | Page, space |
| `--glass` / `--glass-strong` | `rgba(5,12,17,.78/.92)` | Floating panels, dialogs |
| `--edge` / `--edge-strong` | `rgba(150,210,230,.14/.30)` | Hairlines, control borders |
| `--ice` / `--steel` / `--dim` | `#dceef3` / `#91a9b1` / `#5c727a` | Text levels |
| `--signal` / `--caution` / `--alarm` / `--lab` | `#6ff0c0` / `#ffb547` / `#ff5d5d` / `#b9a7f2` | Nominal, stale, failure, simulation |
| Banner | `#0b5a33` | Classification-style status strip |

Data colours (`encoding.ts`): magnitude <4 `#e9b44c`, 4–4.9 `#f08a3e`, 5–5.9 `#e8553a`, 6+ `#d42d55`; volcano `#f07cae`; storm `#62c6e8`; thermal heat ramp ember → red → orange → yellow (`heatStops` in `state/heat.ts`); DWD `#cfd8dc` (feed-only); reports `#f3a77b` (feed-only).

## Marks (D55)

- **Icons:** one line-icon set in `src/state/icons.ts` (24-unit grid, 2px round strokes): seismogram (quake), volcano, cyclone (storm), flame (thermal), warning triangle, document (reports), flask (simulation). The same icon appears in the layer panel, feed cards, globe badges and legend via `KindIcon`. New kinds add an icon there; never use plain dots/squares/triangles as symbols.
- **Earthquakes:** seismic beacons, a white-hot core, magnitude-coloured inner disc, a translucent halo and a crisp ring whose diameter scales with magnitude (`magnitudeSize`); last-hour quakes emit a double ripple.
- **Other point records:** dark glass badges (26px) with a 1.5px ring and the kind icon in the kind colour, soft glow.
- **Dense/area data:** smooth fields, never grids of squares. FIRMS 2° counts render as a 4096×2048 equirectangular heat texture (`buildHeatCanvas`) draped as an imagery layer; opacity fades from 0.92 in orbit to 0.3 below ~1,200 km (`heatAlpha`) so the ground stays readable. Clicks resolve to the 2° cell beneath. Future density layers (aviation/maritime aggregates) follow this pattern.

## Type

- **JetBrains Mono** (variable): instrument labels, HUD, readouts, buttons, timestamps. Uppercase + 0.06–0.16em tracking for labels only.
- **Archivo** (wdth 85–125%): wordmark, counts, magnitude numerals, dialog titles.
- **Atkinson Hyperlegible Next**: anything people read (titles, descriptions, caveats).
- All fonts self-hosted; Vite never inlines assets (`assetsInlineLimit: 0`) because CSP allows only same-origin fonts.

## Globe (`src/components/WorldMap.tsx`)

- CesiumJS via `@cesium/engine` only (the widgets bundle needs `eval`). Runtime assets copied by `scripts/copy-cesium.mjs` into `public/cesium/` (gitignored). Loaded lazily; `?view=list` and `?map=static` never load it.
- Imagery: Satellite = Cesium ion Bing aerial with a token, else dated NASA GIBS VIIRS true colour (keyless; saved Satellite selections migrate to NASA today); NASA today = GIBS VIIRS true colour (latest complete day); Night = GIBS Black Marble. The globe is evenly lit with no ground haze (D55): a live day/night terminator turned half the planet black and the haze washed out data colours. Bundled Natural Earth II stays underneath as the offline base. Esri imagery and reference labels were removed in Phase 16 preflight after the terms review; with a token, world terrain + Google photorealistic 3D cities via ion. The 3D tiles cover the planet and hide every imagery layer, so they only take over below 250 km (back above 400 km); from orbit heat and Night stay visible.
- Point records = accessible DOM buttons projected each render (hidden on the far side). Dense area data (FIRMS 2° cells) = a heat imagery layer (see Marks), clickable, reached by keyboard through the feed.
- Selection draws a target reticle with coordinates. Feed selection and Show on map fly the camera (instant under reduced motion). Filtering never moves the camera.
- WebGL failure falls back to the static SVG map automatically. The static map draws the same heat field (click resolves the cell) and the same point markers.

## Layout

```
┌ UNCLASSIFIED // OPEN-SOURCE PUBLIC DATA // NOT AN EMERGENCY SERVICE ┐
│ GOSIP | GLOBAL OPEN SOURCE INTELLIGENCE   ● clock  FEEDS 4/4  [About][Privacy] │
├──────────────┬────────── full-bleed globe ────────────┬──────────────┤
│ LIVE LAYERS  │ [imagery][filter]          [+] │ 47 LIVE      │
│ ☑ Quakes  44 │                                    [-] │ RECORDS      │
│ WINDOW, VIEW │             ( globe )              [⌂] │ search       │
│ CATEGORIES   │                                        │ cards…       │
│ SOURCES …    │ [legend]            [mode][POS / ALT]  │              │
└──────────────┴────────────────────────────────────────┴──────────────┘
```

## Final polish rules (D64)

- Feed order (D73): launches soonest; supplied quake magnitude / DWD level within compatible kind slots, otherwise newest; aggregated cells (FIRMS) last, busiest first. Stable ID ties; no cross-domain severity. Never let an aggregate layer fill the first page.
- A source that has not been requested yet reads "Waiting"/"standby"; "Unavailable"/"degraded" are for real failures. Tabs load on reveal.
- The legend lists only kinds drawn in the current view. Map mode, static switch and POS/ALT readout form the bottom-right stack on desktop; credits sit on glass.
- Phones: one-line masthead status ("Live · 4 min ago", "Stale · 1 h ago"), all window choices on one row at 320, home altitude 15,500 km.

## Phase 21 design pass (D74)

- **Layer rows:** domain label is a dim mono caption with a fading rule. Each row is two lines: name over scope (always the scope, per layer-quality check 2) on the left; count over retrieval age on the right. Never repeat "Retrieved…" as the row's only description.
- **Cadence:** the publication target sentence and "Publication evidence" sit in one quiet bordered block *below* the layer list; layers are the first thing in the panel. Rail disclosures (`.rail-disclosure`) use the Categories mono-caps summary, not body text.
- **Masthead:** clock (label over time) on the left, publication age over data age on the right. Publication text is steel when on target and `--caution` only when overdue, stale or failed. Phones get a full-width status strip under the wordmark so long states never collide with the buttons.
- **Context marks are quieter than events:** OONI country badges are 20px, thinner ring, 80% opacity until hovered/selected. Apply the same to any future context-only layer (population, annual statistics).
- **Panels** use `--glass-strong` on desktop so text holds over bright imagery; `--dim` is for captions only, never sentences.

## Adding a live layer (Phases 16+)

1. Add kind, colour and glyph in `encoding.ts` (distinct hue *and* shape; avoid the magnitude ramp and status colours).
2. Points → they automatically become DOM markers (beacon or icon badge). Dense grids/areas → a smooth heat/density imagery layer like FIRMS, never square cells. Tracks/orbits (space, aviation, maritime) → Cesium polylines/billboards, aggregated/delayed per safety rules.
3. Add a row in `LayerToggles` (`components/FeedSource.tsx`): `aria-label` must contain the visible label; add its `LiveStatus` block; extend `MapLegend` only if drawn on the globe.
4. Feed card: lead with the most scannable value in the left column, title second, mono meta (age, key measure, provider).
5. Check 1440×900, 390 and 320 wide; the control panel must show every layer without scrolling at 1440×1000.

Phase 16 digital: OONI uses a network line icon and `ooniColor` #82aaff; fixed-size country-context badges, no severity ranking or grid. Compact count in the card gutter, exact total in details, delayed UTC day visible on every card. Country label anchors are not measurement positions; unmapped countries stay feed-only.

Phase 17 space: shared rocket line icon, `launchColor` #d5a6ff, fixed-size launch-site context badges. Feed leads with scheduled UTC date at supplied precision. No countdown, moving spacecraft or observed-launch styling. Space follows existing independent layer controls; forward window meaning is shown in the filter summary and source details.

Phase 18 maritime: ship line icon, `maritimeColor` #58dfdf and a separate smooth cyan imagery glow. Selected gateway totals in 10° regions, ≥72-hour delay, ranges rounded to tens. Glow is activity context, not uniform area density or vessel positions; no square grid. Feed leads with lower bound plus “+”, details show full ten-call range and UTC source day. Eight layer controls fit the desktop viewport; phones retain the existing stacked control layout. Globe/static picking uses the 10° regions, keyboard selection through feed.
