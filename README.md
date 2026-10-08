# G.O.S.I.P. — Global Open Source Intelligence Platform

A free, local-first global event explorer. **Phase 1 is a working explorer: all 18 events are invented and labeled SIMULATED.** No live reports, warnings, or verified observations are provided.

## Run locally

Use Node **22.12+ (22.x), 24+, or newer** and npm. Phase 1 was checked with Node 26.8.1.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173). The server binds to loopback only. No credentials, account, backend, or environment file is needed.

## Explore

- Interactive MapLibre world map with clickable, keyboard-accessible markers, zoom and reset.
- Five independent category filters, country/region/text search, and 6-hour, 24-hour, 3-day, or 7-day windows.
- Persistent selection across map/feed and detail dismissal, with explicit “Show on map,” “Find in feed,” and clear-selection actions. Filtering out an event clears its selection.
- Full-width list mode, controls before results, keyboard focus return, larger mobile controls, and a single page scroll on mobile. Two fingers pan the interactive map; one finger scrolls the page.
- Filter summary, search help, and targeted empty-state actions to restore layers, clear search, or widen the window.
- Copyable, validated URL filters with reload and browser Back/Forward support.
- Detail dialogs with source-demo labels, occurrence/publication/snapshot times, uncertainty, and coverage notes. Escape closes the dialog and restores focus.
- A static SVG map with clickable markers if WebGL, map data, or the map worker fails. “Use static map” also selects it manually. The feed remains fully usable.

Time filters are relative to **8 October 2026, 16:00 UTC**, not the current clock. Default 24-hour view: 12 events; seven days: all 18. Layers are toggles; “All events” restores all categories. Search and time filters apply to both map and feed.

“Copy view link” includes search text, layers, time window, map/list view, and static-map preference. It excludes the selected event and camera position. Search edits replace the current history entry; other filter changes create entries. Invalid URL choices fall back to defaults, search is capped at 200 characters, and unknown parameters are removed. If clipboard access is unavailable, select and copy the displayed link. A localhost link works only where the app is running at that address; nothing is uploaded or hosted. Use `?view=list` or `?map=static` to start without downloading the interactive map engine, worker, stylesheet, or GeoJSON.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development with hot reload |
| `npm run typecheck` | Strict TypeScript checking |
| `npm run build` | Typecheck and production bundle in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | 21 focused provider/filter/provenance/URL tests |
| `npm run test:e2e` | Build, launch production preview, run desktop/mobile browser checks |
| `npm run format:check` | Check source formatting |
| `npm run format` | Format source files |
| `npm run data:map` | Rebuild the committed local map assets |

Browser tests need Chromium: `PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium`. Tests use port 4173 and require it to be available. The 16 checks cover filters, details, focus return, persistent selection, regional map focus, URL/history restoration, clipboard fallback, map-free list/static entry, 320px reflow, map-data failure, missing WebGL, and network loss after initial loading. Browser traces/screenshots go to ignored `test-results/`.

## Stack and structure

React 19.3, TypeScript 7.0, Vite 8.3, Tailwind 4.3, MapLibre 6.13; exact versions are locked in `package-lock.json`.

- `src/App.tsx`: coordinated selection/details, controls, feed, sharing, about dialog.
- `src/state/`: pure URL validation/serialization and browser history synchronization.
- `src/components/`: map lifecycle/fallback and accessible event details.
- `src/data/events.ts`: runtime-validated, fixed synthetic fixtures and pure filtering; a small replaceable provider interface.
- `public/world.geojson`, `public/world.svg`: bundled geography; `scripts/build-map.mjs` rebuilds it with dateline clipping.
- `tests/`: production browser checks; `src/data/events.test.ts` and `src/state/explorer.test.ts`: core unit tests.

## $0 and provenance

Public core access must remain free, without mandatory accounts or paywalls. **No paid service, billing-enabled infrastructure, paid trial, deployment, or API is used.** The app makes no external requests during normal exploration. Dependencies need internet access for the initial install; runtime assets are served locally. Explicitly following an attribution link leaves the app.

Base geography is public-domain [Natural Earth data](https://www.naturalearthdata.com/about/terms-of-use/), bundled through [world-atlas 2.0.2](https://github.com/topojson/world-atlas) (Natural Earth 4.1.0, 1:110m). Redistribution/modification terms were reviewed on 2026-10-08; notices are in `public/`. This historical, generalized map is not authoritative for disputed borders. Event fixtures are original synthetic content, not redistributed third-party news.

Future feeds need source-specific permission/terms checks. Future hosting must work without billing, respect actual quotas, and throttle, cache, or disable layers instead of incurring charges. Free tiers do not guarantee unlimited scale.

## Known limits and next step

This is a local prototype, not an operational intelligence or emergency service. There is no live data, server or local-storage persistence, account system, backend, deployment, service worker, or offline cold-start guarantee. Only filter/view preferences persist in the URL. After assets load, network loss does not prevent filtering or viewing fixtures. MapLibre remains a large lazy-loaded bundle (about 1.08 MB minified / 289 KB gzip, plus a 508 KB worker and 83 KB stylesheet); the build reports its size warning. List/static entry skips those map downloads. Initial app JS is about 257 KB / 81 KB gzip, with 28 KB / 7 KB gzip app CSS. No clustering is needed for 18 events. Chromium desktop/mobile checks are not a Safari/Firefox or assistive-technology audit. The original software license remains undecided (Apache-2.0 proposed); package metadata is `UNLICENSED` until the owner confirms it.

Continue only in a fresh chat using `prompts/NEXT_PHASE_KICKOFF.md`. Phase 1 is committed and pushed to the owner-authorized [G.O.S.I.P. repository](https://github.com/sebastienlato/G.O.S.I.P); local `main` tracks `origin/main`.
