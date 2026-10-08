# G.O.S.I.P. — Phase 2: first real earthquake feed

Act as autonomous lead developer in `/Users/sebastienlato/Dev/GOSIP`. Read `AGENTS.md`, `README.md`, `ROADMAP.md`, `PROJECT_STATE.md`, `DECISIONS.md`, `docs/WORKFLOW.md`, `docs/ARCHITECTURE.md`, and `docs/DATA_POLICY.md` before implementation. Build a visible working increment and stop after Phase 2.

## Starting point

Phases 0 and 1 are implemented. Inspect status/log/remotes first. The owner-authorized `origin` is `https://github.com/sebastienlato/G.O.S.I.P.git`; local `main` tracks `origin/main`. Routine phase commits/pushes are authorized. Never create a different remote, force-push, overwrite history or delete the prior repository.

Use Node 22.12+ (22.x), 24+, or newer. `npm ci`, then `npm run dev` starts a loopback-only app without credentials. React 19.3, TypeScript 7.0, Vite 8.3, Tailwind 4.3 and MapLibre 6.13 are locked.

- `src/data/events.ts`: 18 validated, original synthetic fixtures, demo-only model/provider and pure filters. Fixed snapshot **2026-10-08 16:00 UTC**; default 24h = 12 events, 7d = 18; five categories. No real data is currently integrated or approved.
- `src/App.tsx`: separate selected-event context/detail-dialog state; highlighted map/feed; explicit Show on map/Find in feed; full-width list; mobile controls and single-page feed scrolling; empty-state recovery.
- `src/state/explorer.ts`, `useExplorerFilters.ts`: validated URL `q`, `hours`, `layers`, `view`, `map` filters. Typing replaces history; discrete changes push; Back/Forward restores. Copy view link has a manual fallback. Selection and camera are not shared. Localhost links need the app at that address.
- `src/components/WorldMap.tsx`: interactive MapLibre and local SVG fallback, approximate locations, persistent highlights, explicit regional focus, cooperative gestures. Direct `?view=list` and `?map=static` avoid MapLibre JS/CSS/worker/GeoJSON downloads. Existing map lifecycle, keyboard markers and failure handling must remain usable.
- `src/components/EventDetail.tsx`: native dialog with source, occurrence/publication/snapshot times, uncertainty/coverage, focus return and Show on map.
- Bundled Natural Earth 4.1.0 / world-atlas 2.0.2 assets and notices in `public/`; no external runtime requests in the current app. Existing geography terms recorded in `docs/DATA_POLICY.md`.

Phase 1 checks: build + strict typecheck, **21 core tests**, **16 production Chromium browser checks**, formatting/diff checks, desktop/mobile map/list screenshots. `npm run test:e2e` builds then uses a fresh preview on port 4173. Install Chromium if needed with `PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium`. Screenshots: `docs/screenshots/phase-1-*.png`.

Known limits: synthetic data only, coarse historical boundaries, no clustering/backend/deployment/service worker/offline cold-start guarantee, no Safari/Firefox or screen-reader audit. App JS ~257 KB / 81 KB gzip; app CSS ~28 KB / 7 KB gzip. Interactive-only MapLibre ~1.08 MB / 289 KB gzip plus ~508 KB worker and ~83 KB CSS; documented non-failing chunk warning. Software remains `UNLICENSED` pending owner decision on the Apache-2.0 proposal.

## Deliver Phase 2

Integrate one documented earthquake observation feed with an end-to-end visible map/list/detail experience. Prefer USGS only after reviewing current official terms for this specific use; otherwise use a lawful alternative or a clearly labeled fixture-backed adapter. Record a short source-specific policy note: official endpoint, permitted redistribution/use, attribution, quotas, update cadence, coverage and sensitivity. Do not assume free means unrestricted redistribution. Provider/network/credential unavailability must not stall building.

Generalize the data contract only as needed. Validate untrusted records, coordinates, timestamps, size/count bounds and safe source URLs. Preserve provider identifiers and source links, distinguish earthquake observations and magnitude/depth semantics from verified incident/impact claims, and show occurrence/update/retrieval times, freshness and coverage limitations. Preserve correction status where available; never invent missing values.

Keep real observations and synthetic examples unmistakably separate. The existing demo clock must stay fixed for demo views; real observations need an appropriate actual reference time. Do not accidentally apply the fixed October 8 demo clock to live filtering. Preserve explicit SIMULATED badges/provenance for fixtures and make fallback/stale/error states visible. Retain useful list/static-map access, keyboard/mobile behavior and validated URL state as the model evolves.

Use the simplest bounded client-side adapter that works lawfully, with timeout, no unbounded polling, and a manual retry/refresh if useful. Respect provider cadence. Do not introduce a backend or persistent ingestion pipeline unless indispensable and clearly justified; Phase 3 handles refresh/persistence. No AI, authentication, cloud deployment or unrelated layers in this phase.

## Mandatory $0 and delivery

No charges, billing-enabled services, paid tiers, trials requiring billing, payment methods, domains, automatic upgrades or account creation. Public core access stays free and account-free. Verify actual free terms/quotas; throttle, cache, disable a layer or fall back instead of incurring cost. Protect sensitive positions; avoid tactical conflict tracking. No secrets in code or logs.

Run build/typecheck, focused parser/filter/provider tests, and practical browser checks (including deterministic feed success, malformed data/network failure and fallback). Tests must not depend on a live feed being available. Fix important failures; after three attempts at the same failure, change approach or isolate/defer noncritical functionality and report honestly.

Update concise README, PROJECT_STATE, DECISIONS and the source policy for material changes. Replace `prompts/NEXT_PHASE_KICKOFF.md` with a self-contained Phase 3 kickoff reflecting actual results. Commit all Phase 2 changes, push to the existing authorized remote, verify remote SHA and clean status. If auth/remote is unavailable, finish locally and request the single missing owner action. Report delivered behavior, checks, commit/push, genuine limitations and next prompt path. Stop after Phase 2.
