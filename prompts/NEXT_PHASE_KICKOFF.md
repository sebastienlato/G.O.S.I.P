# G.O.S.I.P. — Phase 1: explorer polish

Act as autonomous lead developer in `/Users/sebastienlato/Dev/GOSIP`. Read `AGENTS.md`, `README.md`, `ROADMAP.md`, `PROJECT_STATE.md`, `DECISIONS.md`, and `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, `docs/DATA_POLICY.md`, and `docs/PRODUCT.md` before implementation. Follow the build-first workflow and stop after Phase 1.

## Actual starting point

Phase 0 is implemented and pushed to GitHub: implementation commit `2ce4434` (`Build Phase 0 local global event explorer`), followed by a documentation update recording remote setup. The owner explicitly authorized `https://github.com/sebastienlato/G.O.S.I.P.git` as `origin`; local `main` tracks `origin/main`. Inspect current status/remotes and continue using this authorized destination. Never delete the previous repository, create an unauthorized remote, overwrite remote history, or force-push.

The runnable application uses React 19.3, TypeScript 7.0, Vite 8.3, Tailwind 4.3, and MapLibre 6.13. Use Node 22.12+ (22.x), 24+, or newer. `npm ci`, then `npm run dev` starts a loopback-only server. No credentials/environment variables needed.

- `src/App.tsx`: category/search/time/view state, event feed, about dialog.
- `src/data/events.ts`: 18 runtime-validated synthetic fixtures, demo-only event model/provider, filtering and date helpers. The fixed snapshot is **2026-10-08 16:00 UTC**. Default 24h shows 12 events; 7d shows all 18. Five categories: Environment, Earth & activity, Digital world, Science & space, Global affairs.
- `src/components/WorldMap.tsx`: local GeoJSON MapLibre map, explicit Vite-bundled module worker URL, resize/lifecycle cleanup, keyboard markers, static SVG fallback for map/network/WebGL failures and manual switching.
- `src/components/EventDetail.tsx`: native modal with timestamps, synthetic provenance, uncertainty/coverage notes, Escape and focus return.
- `public/world.geojson`, `public/world.svg`: committed Natural Earth 4.1.0 / world-atlas 2.0.2 assets, terms/notices in `public/`. `npm run data:map` regenerates and clips spherical geometry at the dateline for MapLibre.

Phase 0 verification: `npm run build` (includes typecheck), 17 passing core tests via `npm test`, 10 passing production browser checks via `npm run test:e2e`, formatting via `npm run format:check`, local launch and screenshot inspection. Browser tests use a fresh preview server on port 4173. Install Chromium if needed with `PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium`. Desktop/mobile screenshots are in `docs/screenshots/`.

Known limits: coarse historical map boundaries, only 18 fixtures, no clustering, no URL/session persistence, no live updates, no backend, deployment, or service worker. No offline cold-start promise. Chromium mobile emulation is not Safari testing or a full screen-reader audit. Lazy MapLibre is ~1.04 MB minified (~282 KB gzip), plus ~508 KB worker; the build emits a non-failing chunk-size warning. The proposed Apache-2.0 license remains unconfirmed; package metadata is `UNLICENSED`.

## Deliver Phase 1

Build a visible explorer refinement using the existing app. Improve map/feed coordination (selected-event context and intentional map focus), make keyboard and mobile navigation smoother, refine search/filter clarity and useful empty states, and preserve an equally useful list-only experience. Add shareable validated filter state in the URL if useful. Improve map labels or marker grouping only where they materially help; do not add clustering machinery just for 18 fixtures. Assess bundle loading and touch/readability concerns without turning the phase into an exhaustive audit.

Keep scope practical and autonomous. Preserve prominent SIMULATED labeling, the fixed demo clock, source/timestamp/uncertainty/coverage disclosures, approximate regional locations, and resilient static-map/feed access. Do not add live feeds in this phase (first real feed is Phase 2), a backend, AI, auth, cloud deployment, or paid services.

**Mandatory $0:** no charges, trials requiring billing, payment methods, paid tiers, domains, billing-enabled infrastructure, or automatic upgrades. Public core access stays free and account-free. Never assume unlimited free quotas. If an optional provider is unavailable, retain bundled/offline fixtures rather than stall. Review exact terms before any third-party redistribution.

Run build/typecheck, focused core tests, and practical browser checks, fixing important issues. After three attempts at the same failure, change approach or isolate/defer noncritical functionality and report honestly. Keep docs concise. Update README, PROJECT_STATE, and DECISIONS for material changes. Replace this file with a self-contained Phase 2 kickoff reflecting actual results. Commit all Phase 1 changes and push to the configured authorized GOSIP remote, verifying push and clean status. If missing, finish locally and request the single missing owner action without claiming a push. Report delivered behavior, checks, commit/push, genuine limits, and the next prompt path. Stop after Phase 1.
