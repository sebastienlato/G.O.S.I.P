# Architecture — Phase 1

A static React + TypeScript application. `App.tsx` owns persistent event selection separately from the open detail dialog and explicit map-focus requests. One filtered array drives map/feed. Hidden selections clear; dismissal preserves context. `src/state/explorer.ts` validates/serializes URL filters and `useExplorerFilters.ts` synchronizes browser history. Typing replaces history; discrete changes push; Back/Forward restores state. No local storage or backend.

`src/data/events.ts` retains the fixed demo clock, 18 runtime-validated fixtures, synchronous replaceable provider interface, and pure filtering/formatting helpers. The parser deliberately accepts only simulated records. Phase 2 must introduce an explicit real-observation contract rather than weakening simulation labeling.

`WorldMap.tsx` dynamically imports MapLibre JS and CSS only in interactive mode, supplies Vite's bundled module-worker URL, and handles resize/lifecycle cleanup. Direct list/static entry avoids the engine, stylesheet, worker and GeoJSON downloads. Failure or timeout exposes the local SVG map with semantic marker buttons. Selected markers initialize correctly after map recreation. An explicit focus request jumps to a regional view, accounting for the longitude constraint on wide displays. Cooperative gestures preserve page scrolling on touch screens.

Controls precede results; list mode uses the full content width. Mobile feed scrolls with the page. Native detail dialogs contain focus and restore the trigger; “Show on map” deliberately transfers focus to the map region. The selected context also links back to the feed. Search is bounded and rendered as text; URL values are whitelisted and canonicalized.

Natural Earth spherical geometry is clipped at the antimeridian during `npm run data:map`. Committed GeoJSON/SVG require no provider or generation step. SVG uses equirectangular projection; MapLibre uses Mercator. Neither is authoritative geography.

Vite builds `dist/`; Vitest checks data/filter/URL semantics; Playwright checks production desktop/mobile interaction and injected failures. No external fonts, tiles, telemetry, API, auth, database, service worker or deployment. Future feeds must satisfy exact source permissions and the strict $0 mandate; add ingestion/caching only as needed.
