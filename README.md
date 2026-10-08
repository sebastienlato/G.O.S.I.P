# G.O.S.I.P. — Global Open Source Intelligence Platform

A free, local-first global event explorer. **Phase 2 adds USGS earthquake observations alongside a separate, explicitly SIMULATED demo.** This is a prototype, not an emergency or impact assessment service.

## Run locally

Use Node **22.12+ (22.x), 24+, or newer** and npm. Checked with Node 26.8.1.

```sh
npm ci
npm run dev
```

Open the loopback URL printed by Vite (normally http://127.0.0.1:5173). No credentials, account, backend, or environment file is needed.

## Explore

- Choose **USGS earthquakes** for the M2.5+ past-week observation feed. The first selection requests it once; refresh/retry is manual. Map, list, search, time windows, selection, keyboard details and explicit “Show on map” / “Find in feed” work with observations.
- Source details show occurrence, provider update, feed generation and retrieval times, provider ID/network/code, review status, magnitude/type and depth. Missing values remain “Not supplied.” Estimates and provider review do not establish damage, casualties or verified impacts.
- The source panel identifies freshness, rejected/excluded records, coverage gaps and failures. Snapshots older than 15 minutes are marked stale; a failed refresh retains any prior snapshot with a stale warning. A successful refresh replaces it, including corrections/removals. There is no revision/deletion history.
- **Simulated examples** is the default and explicit offline fallback. Its 18 invented events across five categories retain the fixed **2026-10-08 16:00 UTC** clock: 24h = 12 events, 7d = 18. Switching sources clears search/layers/selection; time/view/map preferences remain. Observations and fixtures are never merged or silently substituted.
- USGS windows use the current device clock at minute resolution, not the demo clock. A shared USGS link requests a new snapshot and is not a historical permalink.
- Interactive MapLibre map, persistent selection, regional focus and cooperative touch gestures; a local clickable SVG fallback when WebGL/map loading fails. Markers are estimates; overlapping markers can be explored in the full feed. Country search for USGS depends on provider place text; no country is inferred.
- Full-width list mode, mobile controls and one page scroll, targeted empty-state recovery, native detail dialogs with focus return. Direct `?view=list` or `?map=static` avoids interactive map JS/CSS/worker/GeoJSON downloads. Add `source=usgs` to either for observations.

“Copy view link” preserves validated source, search, layers, window, map/list and static-map preferences. Typing replaces history; other changes push; Back/Forward restores. Selection/camera/data are not shared. Unknown parameters are removed, categories are whitelisted and search is capped at 200 characters. Clipboard failure exposes a manual copy field. Localhost links require the app at that address.

## Commands and checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Loopback development server |
| `npm run typecheck` | Strict TypeScript checking |
| `npm run build` | Typecheck and production bundle |
| `npm run preview` | Loopback production preview |
| `npm test` | 40 focused parser/provider/filter/URL tests |
| `npm run test:e2e` | Build, fresh preview on port 4173, 26 desktop/mobile Chromium checks |
| `npm run format:check` / `npm run format` | Check / apply source formatting |
| `npm run data:map` | Rebuild committed local geography |

Browser tests need Chromium: `PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium`. Port 4173 must be available. Tests intercept the earthquake endpoint with invented test-only responses; no check depends on live feed availability. Coverage includes success, malformed/network failure, explicit fallback/retry, stale/retained data, corrections/removal, missing values, current versus demo time, map selection, URL/history, mobile reflow, keyboard access, and map-free list/static entry. Phase 2 screenshots in `docs/screenshots/` show mocked test responses, not actual earthquakes.

## Structure

React 19.3, TypeScript 7.0, Vite 8.3, Tailwind 4.3 and MapLibre 6.13; dependency versions are locked.

- `src/data/events.ts`: discriminated demo/observation contract, unchanged demo parser/fixtures and filtering.
- `src/data/usgs.ts`: bounded USGS parser/provider, stream size limit, timeout, deduplication and cadence.
- `src/state/`: source-aware URL/history and in-memory earthquake loading/freshness.
- `src/components/`: source panel, accessible details, map lifecycle/fallback.
- `public/`: bundled Natural Earth geography and notices.
- `tests/`: deterministic production-browser checks and test-only transport fixtures.

## $0 and provenance

Public core access remains free and account-free. **No billing, paid service, hosting, trial, API key or account is used.** Selecting USGS makes a direct credential-free HTTPS request to `earthquake.usgs.gov`, which receives usual connection information including the visitor's IP. No analytics, external fonts or map tiles. Demo-only exploration makes no external requests; following source links leaves the app.

USGS scientific data are published at no cost. Source-specific attribution, use/redistribution basis, coverage, cadence and rate limits are recorded in [DATA_POLICY](docs/DATA_POLICY.md). Feed requests have a 12-second timeout, 2 MB body limit and 2,000-record envelope limit; no silent truncation. At least 60 seconds between attempts per page session, with 5-minute fallback backoff on HTTP 429 and longer exposed Retry-After respected. No polling, persistent cache or cross-tab/reload throttle. Provider service limits are not an unlimited-traffic guarantee. Future scale must use bounded caching/throttling or disable the layer; never upgrade to a paid service.

Base geography is public-domain [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), via world-atlas 2.0.2 (Natural Earth 4.1.0, 1:110m), with local notices. Historical generalized boundaries are illustrative. Software remains `UNLICENSED` pending the owner's Apache-2.0 decision.

## Limits and next phase

No backend, deployment, persistence, automatic ingestion, service worker or offline cold-start guarantee. The loaded snapshot remains usable during network loss; returning to a previously loaded USGS view requires manual refresh to check for changes. Device clock accuracy affects live windows. Regional detection/reporting gaps, provider corrections and overlapping markers remain. No clustering, Safari/Firefox or screen-reader audit.

Initial app JS is ~267 KB / 85 KB gzip, app CSS ~29 KB / 7 KB gzip. Interactive-only MapLibre is ~1.08 MB / 289 KB gzip plus a ~508 KB worker and ~83 KB CSS. Its documented chunk warning is non-failing; list/static entry avoids those downloads.

Phase 2 stops here. Continue in a fresh chat using `prompts/NEXT_PHASE_KICKOFF.md` for refresh and persistence. Local `main` tracks the owner-authorized [G.O.S.I.P. repository](https://github.com/sebastienlato/G.O.S.I.P).
