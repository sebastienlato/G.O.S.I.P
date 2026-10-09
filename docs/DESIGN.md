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

Data colours (`encoding.ts`): magnitude <4 `#e9b44c`, 4–4.9 `#f08a3e`, 5–5.9 `#e8553a`, 6+ `#d42d55`; volcano `#f07cae` triangle; storm `#62c6e8` eye ring; thermal cells yellow→red translucent heat by count (`fireCellSteps`); DWD `#cfd8dc` square (feed-only); reports `#f3a77b` document (feed-only).

## Type

- **JetBrains Mono** (variable): instrument labels, HUD, readouts, buttons, timestamps. Uppercase + 0.06–0.16em tracking for labels only.
- **Archivo** (wdth 85–125%): wordmark, counts, magnitude numerals, dialog titles.
- **Atkinson Hyperlegible Next**: anything people read (titles, descriptions, caveats).
- All fonts self-hosted; Vite never inlines assets (`assetsInlineLimit: 0`) because CSP allows only same-origin fonts.

## Globe (`src/components/WorldMap.tsx`)

- CesiumJS via `@cesium/engine` only (the widgets bundle needs `eval`). Runtime assets copied by `scripts/copy-cesium.mjs` into `public/cesium/` (gitignored). Loaded lazily; `?view=list` and `?map=static` never load it.
- Imagery: Satellite = Cesium ion Bing aerial with a token, else Esri World Imagery (keyless); NASA today = GIBS VIIRS true colour (latest complete day); Night = GIBS Black Marble. Night lights blend on the dark side under real-time sun lighting. Bundled Natural Earth II stays underneath as the offline base. Optional labels (Esri reference) and, with a token, world terrain + Google photorealistic 3D cities via ion.
- Point records = accessible DOM buttons projected each render (hidden on the far side). Dense area data (FIRMS 2° cells) = one `GroundPrimitive`, pickable, reached by keyboard through the feed.
- Selection draws a target reticle with coordinates. Feed selection and Show on map fly the camera (instant under reduced motion). Filtering never moves the camera.
- WebGL failure falls back to the static SVG map automatically.

## Layout

```
┌ UNCLASSIFIED // OPEN-SOURCE PUBLIC DATA // NOT AN EMERGENCY SERVICE ┐
│ GOSIP | GLOBAL OPEN SOURCE INTELLIGENCE   ● clock  FEEDS 4/4  [About][Privacy] │
├──────────────┬────────── full-bleed globe ────────────┬──────────────┤
│ LIVE LAYERS  │ [imagery][filter][labels]          [+] │ 47 LIVE      │
│ ☑ Quakes  44 │                                    [-] │ RECORDS      │
│ WINDOW, VIEW │             ( globe )              [⌂] │ search       │
│ CATEGORIES   │                                        │ cards…       │
│ SOURCES …    │ [legend]        [POS / ALT]   [mode]   │              │
└──────────────┴────────────────────────────────────────┴──────────────┘
```

## Adding a live layer (Phases 16+)

1. Add kind, colour and glyph in `encoding.ts` (distinct hue *and* shape; avoid the magnitude ramp and status colours).
2. Points → they automatically become DOM markers. Dense grids/areas → add a pickable primitive like the FIRMS cells. Tracks/orbits (space, aviation, maritime) → Cesium polylines/billboards, aggregated/delayed per safety rules.
3. Add a row in `LayerToggles` (`components/FeedSource.tsx`): `aria-label` must contain the visible label; add its `LiveStatus` block; extend `MapLegend` only if drawn on the globe.
4. Feed card: lead with the most scannable value in the left column, title second, mono meta (age, key measure, provider).
5. Check 1440×900, 390 and 320 wide; the control panel must show every layer without scrolling at 1440×1000.
