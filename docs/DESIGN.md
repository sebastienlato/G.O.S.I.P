# Design system: "night chart"

The web explorer reads like an instrument: the map comes first, colour carries data, and the interface stays quiet. Follow these rules when adding layers or UI. Screenshots in `docs/screenshots/design-pass/` use stand-in development data (never published).

## Principles

1. **Map first.** Masthead (64px) + one control rail, then the map/feed stage fills the viewport. Secondary material (source status, place/history, simulation lab) sits below the stage. Don't add panels above the map.
2. **Colour is data.** Only data marks use saturated colour. UI chrome uses the neutral tokens. Status uses `--ok` / `--warn` dots with text, never colour alone.
3. **One encoding everywhere.** Map markers, legend, layer chips and feed cards all come from `src/state/encoding.ts`. Never pick marker colours inside a component.
4. **Plain words, sentence case.** No all-caps labels or decorative eyebrows. Short UI copy; caveats live in details, source panels and dialogs.
5. **One motion.** Only earthquakes from the last hour pulse (disabled under reduced motion). Everything else responds to user actions only.

## Tokens (`src/styles.css` `:root`)

| Token | Value | Use |
| --- | --- | --- |
| `--abyss` | `#0a1822` | Page and ocean |
| `--deep` | `#0f212c` | Feed column, panels, dialogs |
| `--lift` | `#16303d` | Hover, selected, inputs |
| `--land` | `#1b2e37` | Land (map style + `world.svg`) |
| `--rule` / `--rule-strong` | `#24404e` / `#3a5a69` | Dividers / control borders |
| `--chalk` / `--mist` / `--faint` | `#e7eeeb` / `#9db1b7` / `#6f8890` | Text levels |
| `--ok` / `--warn` / `--lab` | `#7fd1ae` / `#e9b44c` / `#b9a7f2` | Healthy, stale, simulation |

Data colours (`encoding.ts`): magnitude below 4 `#e9b44c`, 4–4.9 `#f08a3e`, 5–5.9 `#e8553a`, 6+ `#d42d55`; volcanoes `#f07cae` (triangle); storms `#62c6e8` (eye ring); FIRMS cells `#ffd23f` (diamond); DWD warnings `#cfd8dc` (square, feed-only).

## Type

- **Atkinson Hyperlegible Next** (variable, self-hosted via `@fontsource-variable`): all reading text. Base 15px; scale 12 / 13.5 / 15 / 17 / 20 / 24.
- **Archivo** wide (`font-stretch` 110–125%): wordmark, feed count, magnitude numerals, dialog titles only.
- Fonts are bundled (CSP `font-src 'self'`); no external font requests.

## Marker encoding

- Earthquakes: diameter from magnitude (`magnitudeSize`, ~7px at M2.5 to ~33px at M7.5), colour from magnitude step, opacity fades from 1 to 0.4 across 7 days. Phones scale markers by 0.7.
- Hazards: fixed-size glyph by kind. Simulations: hollow category-coloured ring.
- Draw order: large/old first so small/fresh marks stay clickable.
- The 30° dashed graticule under land is the map's signature. Keep it subtle.

## Adding a live layer (Phase 14+)

1. Add its kind, colour and glyph in `encoding.ts` (pick a hue distinct from the magnitude ramp, and a distinct shape).
2. Add a chip in `LayerToggles` (`components/FeedSource.tsx`) with an `aria-label` that contains the visible label, plus a status block in `LiveStatus`.
3. Extend `MapLegend` with the glyph and one short line.
4. Feed cards: lead with the most scannable value in the left column (as magnitude does for earthquakes), title second, then meta: age, key measure, provider.
5. Check desktop 1440, phone 390 and 320px; keep the rail to one row at 1440.

## Components

`App.tsx` owns state and composition. `EventFeed` / `EventCard` render the feed, `WorldMap` + `MapLegend` the map, `FeedSource.tsx` exports `LayerToggles`, `LiveStatus` and `SimulationLab`, `AboutDialog` the about/privacy dialog.

Phase 14: category buttons live in a disclosure to keep the desktop rail on one row. Phones use a two-column toggle grid and wrapped time/view controls. Thermal cards lead with the detection count, not a fire count; warning cards show original-language title, validity and DWD level.

Phase 15: reports use peach `#f3a77b` and an outlined document glyph (feed-only), with an explicit attributed-claim label and byline. Five toggles retain the single desktop rail and two-column mobile grid. DWD defaults off; live Global affairs joins the category disclosure. Report detail and source status carry delay/rights/coverage caveats.

Global-cell feeds render 50 cards per page; total counts, filtering and map retain every record. Map selection reveals its feed page; keyboard selection and search remain available for overlapping map marks.
