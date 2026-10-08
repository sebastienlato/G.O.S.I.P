# Architecture — Phase 0

A static React + TypeScript application. `App.tsx` owns search, selected categories, time window, view, and detail selection. One filtered event array drives the map and feed. `src/data/events.ts` owns the fixed demo clock, 18 runtime-validated fixtures, a synchronous replaceable provider interface, and pure filtering/formatting helpers.

`WorldMap.tsx` dynamically imports MapLibre and explicitly supplies Vite's bundled module-worker URL. It uses local GeoJSON only, with resize observation and lifecycle cleanup. Failure or timeout exposes a local SVG map with semantic marker buttons; the event feed always remains available. Map markers retain their DOM identity across selection so focus can return after details close. Native modal dialogs provide focus containment and Escape handling.

Natural Earth spherical geometry is clipped at the antimeridian during `npm run data:map`, avoiding cross-world polygon seams. Generated GeoJSON and SVG are committed, so setup requires no map provider or generation step. The SVG uses an equirectangular projection; MapLibre uses Mercator. Neither is authoritative geography.

Vite builds `dist/`; Vitest exercises provider/filter semantics; Playwright tests the production preview at desktop/mobile sizes and injected failures. No backend, queue, auth, database, API, telemetry, external font, external tiles, or service worker.

Future phases should generalize the event model at the first real-feed boundary, preserve validation/provenance, and introduce asynchronous ingestion or caching only when needed. Keep the strict $0 mandate: no billing-enabled hosting, no paid APIs, no upgrades; throttle or disable unavailable layers.
