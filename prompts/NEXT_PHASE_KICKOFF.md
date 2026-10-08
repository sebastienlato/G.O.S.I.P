# G.O.S.I.P. — Phase 3: refresh and persistence

Act as autonomous lead developer in `/Users/sebastienlato/Dev/GOSIP`. Read `AGENTS.md`, `README.md`, `ROADMAP.md`, `PROJECT_STATE.md`, `DECISIONS.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, and `docs/DATA_POLICY.md` before implementation. Deliver a visible working increment and stop after Phase 3.

## Starting point

Phases 0–2 are complete. Inspect status/log/remotes first. Local `main` tracks owner-authorized `origin` at `https://github.com/sebastienlato/G.O.S.I.P.git`. Routine phase commits/pushes are authorized; never create a different remote, force-push, overwrite history or delete another repository.

Use Node 22.12+ (22.x), 24+, or newer; last checked on Node 26.8.1. `npm ci`, then `npm run dev` starts the loopback-only app with no credentials. Locked stack: React 19.3, TypeScript 7.0, Vite 8.3, Tailwind 4.3, MapLibre 6.13.

- `src/data/events.ts`: discriminated `DemoEvent | EarthquakeEvent`, pure filters with explicit reference clock. Demo parser accepts only simulations. 18 original fixtures retain fixed **2026-10-08 16:00 UTC**; default 24h = 12, 7d = 18. Do not weaken these labels or use the demo clock for observations.
- `src/data/usgs.ts`: documented public USGS/ANSS endpoint `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson`. Runtime validates envelope, count, IDs, strings, coordinates, times and allowed HTTPS source links. Optional measurements/review/update remain null. Non-earthquake records are excluded; bad records counted, all-invalid response fails. 12-second timeout; 2,000,000-byte streamed limit; 2,000 input records. One in-flight request; 60-second per-page attempt interval; 429 at least 5-minute backoff and longer exposed Retry-After. No network polling.
- `src/state/useEarthquakes.ts`: one fetch on first source selection; in-memory snapshot, error, UI-only clock/cooldown. Manual refresh/retry. Successful response replaces the snapshot; failure retains prior data with visible stale label. Local stale threshold is 15 minutes from older of feed generation/retrieval. Switching away/back does not refetch. No persistent cache, reload/cross-tab coordination or correction history yet.
- `FeedSource.tsx`, `EventDetail.tsx`: separate source choice and explicit simulated fallback; generation/retrieval/occurrence/update times, credits, magnitude/type/depth, provider ID/network/code/review status, missing-value and coverage/uncertainty text. Reviewed parameters are not verified impacts. A supplied `deleted` status is labeled withdrawn; disappeared records are removed on refresh without inventing a deletion reason.
- `src/state/explorer.ts`, `useExplorerFilters.ts`: validated URL `source=usgs`, `q`, `hours`, `layers`, `view`, `map`; default source is demo. Typing replaces history, discrete choices push, Back/Forward restores, clipboard fallback works. Source switching clears search/layers/selection, retains window/view. Selected event, camera and data are not shared. A USGS URL is a current view, not a historical snapshot.
- `src/App.tsx`, `WorldMap.tsx`: map/list/detail selection, highlight, Show on map/Find in feed, keyboard focus, mobile controls and page scrolling, local SVG fallback. Direct list/static entry skips MapLibre JS/CSS/worker/GeoJSON. Preserve map lifecycle/failure handling. Live views expose only Earth & activity; fixture views retain all five layers.
- Public Natural Earth 4.1.0 / world-atlas 2.0.2 assets/notices unchanged. No remote tiles, fonts, analytics, credentials, backend or deployment.

Phase 2 validation: build/strict typecheck, **40 core tests**, **26 production Chromium browser checks**, formatting/diff checks and desktop/mobile visual checks passed. `npm run test:e2e` builds then starts a fresh preview on port 4173. Install Chromium if needed: `PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium`. Browser responses under `tests/fixtures/` are invented test-only payloads, never production observations. `docs/screenshots/phase-2-*-mocked-usgs.png` are mocked QA screenshots. One live adapter check accepted 308 records with no rejections; tests do not depend on that feed or count.

Known limits: no persistent or cross-tab cache, automatic refresh, history, clustering, deployment, service worker or cold-start offline guarantee. Device clock and provider coverage/reporting delays affect live views. Crowded markers overlap; list remains usable. App JS ~267 KB / 85 KB gzip, app CSS ~29 KB / 7 KB gzip; lazy MapLibre ~1.08 MB / 289 KB gzip plus ~508 KB worker and ~83 KB CSS. Existing chunk warning is non-failing. No Safari/Firefox or screen-reader audit. Software remains `UNLICENSED` pending owner decision on Apache-2.0.

## Deliver Phase 3

Make refresh and persistence useful and resilient end to end. Prefer a small client-side implementation; add an API/backend only if indispensable and clearly justified. Preserve all Phase 2 source semantics and source-specific permission scope. No unrelated feeds, AI, auth or cloud deployment.

Provide bounded storage of the last usable earthquake snapshot with runtime revalidation, versioning, expiry/retention and a visible clear-cache control. A restored snapshot must clearly say it is cached and when generated/retrieved; stale cache must never present as a new fetch. Corrupt/unavailable/full storage must fail gracefully and leave demo/list/static access usable. Do not claim offline cold-start support without testing the actual asset-loading path.

Improve refresh resilience and cadence, including reload/cross-tab coordination if practical. If adding automatic refresh, make it bounded and visible, respect provider cadence and Retry-After, pause when hidden/offline, avoid concurrent requests/retry storms, and support manual refresh. Keep the last valid snapshot while refreshing or after failure; expose status and retry timing. A provider response must replace current data including corrections/removals. Do not invent revision history or deleted-event claims when records simply leave a moving window. Keep real and synthetic arrays/clocks separate.

Use current official USGS service guidance if changing usage. Do not assume an unlimited numeric quota. Keep request/body/count bounds and fail closed when unavailable or rate-limited. Source review in `docs/DATA_POLICY.md` covers public earthquake summary parameters only, not other products.

Run build/typecheck, focused cache/refresh/provider/filter tests and deterministic browser checks for reload, stale restoration, storage failure/corruption, refresh success/failure/rate limit, source separation and core explorer regressions. No automated test may depend on live feed availability. Fix important failures; after three attempts at the same failure, change approach or isolate/defer noncritical functionality and report honestly.

## Mandatory $0 and delivery

No charges, billing-enabled services, paid tiers, billing trials, payment methods, domains, account creation or automatic upgrades. Public core access remains free and account-free. Cache, throttle, disable a layer or use explicit synthetic fallback instead of paying. No secrets or unnecessary sensitive positions.

Update concise README, PROJECT_STATE, DECISIONS and relevant architecture/source policy for material changes. Replace `prompts/NEXT_PHASE_KICKOFF.md` with a self-contained Phase 4 kickoff reflecting actual results. Commit all Phase 3 changes, push to the existing authorized remote, and verify remote SHA and clean status. If auth/remote is unavailable, finish locally and request the single missing owner action. Report delivered behavior, checks, commit/push, genuine limits and next prompt path. Stop after Phase 3.
