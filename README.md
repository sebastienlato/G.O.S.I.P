# G.O.S.I.P. — Global Open Source Intelligence Platform

A free, local-first global event explorer. **Phase 5 adds multilingual, explicitly synthetic global reports with attributed-claim semantics and a bounded correction example.** Cached USGS earthquakes, NWS New York forecasts and separate environment/original demos remain available. This is a prototype, not an emergency or impact assessment service.

## Run locally

Use Node **22.12+ (22.x), 24+, or newer** and npm. Checked with Node 26.8.1.

```sh
npm ci
npm run dev
```

Open the loopback URL printed by Vite (normally http://127.0.0.1:5173). No credentials, account, backend, or environment file is needed.

## Explore

- **Global reports · simulated** (`?source=reports-demo`): six original fictional reports in English, French, Spanish and Arabic. Filter by source language and supplied correction, search publisher/original text/supplied translation, and share those filters. Global affairs is the available layer. Publication windows use the fixed **2026-10-08 16:00 UTC** demo snapshot: 6h = 1, 24h = 4, 7d = 6. Reports are attributed claims, never verified incidents; repetition is not independent corroboration.
- Report details distinguish publisher, language, original text, one explicitly supplied synthetic English translation, scenario publication/update/retrieval and optional claimed occurrence. Missing times/translations remain missing. Original links open bundled plain-text source fixtures with fictional-publisher labels, not external news articles. One correction compares a supplied prior version with the current version; no complete revision history is claimed.
- Four broad illustrative region markers; an unknown-location report and a safety-withheld report remain in the feed without coordinates or map navigation. No sensitive/tactical positions, automatic geocoding, news requests, report persistence or automatic translation. ReliefWeb needs an approved application name and source-specific rights checks; Wikinews is read-only. See the independent [Phase 5 source review](docs/DATA_POLICY.md#phase-5--global-report-source-review-2026-10-08). No live news integration was enabled.

- **NWS weather · New York** (`?source=nws`): one forecast grid cell near Lower Manhattan, not global weather. Periods show temperature/unit, precipitation chance, wind and unaltered forecast text. Windows look **forward** for overlapping validity intervals, with soonest periods first; expired periods disappear. Update, generation, retrieval and validity times stay distinct. These are predictions, not measurements, official alerts or confirmed impacts. One map marker represents the selected or earliest period; use the feed to explore all periods.
- Weather loads once on first eligible selection, then refreshes manually no more than hourly in this page. Two requests resolve the current grid and load its forecast; 12 seconds total, 100 KB per response, maximum 32 periods. Missing values remain missing; invalid periods are counted, all-invalid/oversized responses fail. A failed refresh retains prior data as stale; success replaces it. Six-hour staleness is measured from the oldest provider/retrieval time. Weather is **memory only**: no saved cache, reload/tab coordination or automatic retries. Offline/hidden attempts pause; reconnect requires manual refresh.
- **Fire examples · simulated** (`?source=fire-demo`): four separate original sensor scenarios with invented radiative power (MW), brightness temperature (K) and detection confidence labels. They explain clouds, overpass gaps, industrial heat and why a hot pixel does not establish wildfire perimeter, burned area or impact. Broad locations and all values are explicitly synthetic. Fixed demo clock; 24h = 2 examples, 7d = 4. No NASA feed, account or API key is used.

- Choose **USGS earthquakes** for the M2.5+ past-week observation feed. The first selection restores a validated saved snapshot, or requests it once when online, visible and outside cooldown; refresh/retry is manual. Restored snapshots are explicitly labeled cached with their original timestamps, even when stale. Map, list, search, time windows, selection, keyboard details and explicit “Show on map” / “Find in feed” work with observations.
- Source details show occurrence, provider update, feed generation and retrieval times, provider ID/network/code, review status, magnitude/type and depth. Missing values remain “Not supplied.” Estimates and provider review do not establish damage, casualties or verified impacts.
- The source panel identifies freshness, rejected/excluded records, coverage gaps and failures. Snapshots older than 15 minutes are marked stale; a failed refresh retains any prior snapshot with a stale warning. A successful refresh replaces it, including corrections/removals. There is no revision/deletion history.
- One snapshot is stored locally (versioned, maximum 2 MB / 2,000 source records) for 24 hours from the older of generation/retrieval. It is revalidated on restore, discarded if corrupt/expired, and removed on the next cache access or active USGS clock tick after expiry. **Clear saved USGS cache** removes the saved copy while retaining current in-memory observations and the request cooldown. Successful refresh saves a new copy. Storage denial/fullness is visible and leaves the page usable.
- Tabs on the same origin/browser profile share saved results, request cooldowns and failure status. Web Locks prevent concurrent requests; no requests queue behind another tab. Without locks, coordination is best effort; without working storage, only page-local cooldowns are reliable. Offline/hidden requests pause, with no automatic retry on reconnect.
- **Simulated examples** is the default and explicit offline fallback. Its 18 invented events across five categories retain the fixed **2026-10-08 16:00 UTC** clock: 24h = 12 events, 7d = 18. Switching sources clears search/layers/selection; time/view/map preferences remain. Observations and fixtures are never merged or silently substituted.
- USGS windows use the current device clock at minute resolution, not the demo clock. A shared USGS link opens the current view using a saved snapshot or a new request; it is not a historical permalink.
- Interactive MapLibre map, persistent selection, regional focus and cooperative touch gestures; a local clickable SVG fallback when WebGL/map loading fails. Markers are estimates; overlapping markers can be explored in the full feed. Country search for USGS depends on provider place text; no country is inferred.
- Full-width list mode, mobile controls and one page scroll, targeted empty-state recovery, native detail dialogs with focus return. Direct `?view=list` or `?map=static` avoids interactive map JS/CSS/worker/GeoJSON downloads. Add `source=usgs` to either for observations.

“Copy view link” preserves validated source, search, layers, window, report language/correction filters, map/list and static-map preferences. Typing replaces history; other changes push; Back/Forward restores. Selection/camera/data are not shared. Unknown parameters are removed, categories are whitelisted and search is capped at 200 characters. Clipboard failure exposes a manual copy field. Localhost links require the app at that address.

## Commands and checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Loopback development server |
| `npm run typecheck` | Strict TypeScript checking |
| `npm run build` | Typecheck and production bundle |
| `npm run preview` | Loopback production preview |
| `npm test` | 100 focused report/environment/cache/refresh/parser/provider/filter/URL tests |
| `npm run test:e2e` | Build, fresh preview on port 4173, 68 desktop/mobile Chromium checks |
| `npm run format:check` / `npm run format` | Check / apply source formatting |
| `npm run data:reports` | Rebuild bundled original report source documents |
| `npm run data:map` | Rebuild committed local geography |

Browser tests need Chromium: `PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium`. Port 4173 must be available. Tests intercept earthquake and weather endpoints with invented test-only responses; no check depends on live feed availability. Coverage includes success, malformed/network failure, explicit fallback/retry, stale/retained data, corrections/removal, missing values, current versus demo time, map selection, URL/history, mobile reflow, keyboard access, and map-free list/static entry. Screenshots in `docs/screenshots/` show mocked QA responses or labeled synthetic examples, never evidence of actual conditions. Phase 5 adds desktop/mobile report lists, correction details and map views; original report documents are consistency-checked against the fixtures.

## Structure

React 19.3, TypeScript 7.0, Vite 8.3, Tailwind 4.3 and MapLibre 6.13; dependency versions are locked.

- `src/data/events.ts`: discriminated demo/observation contract, unchanged demo parser/fixtures and filtering.
- `src/data/usgs.ts`: bounded USGS parser/provider, stream size limit, timeout, deduplication and cadence.
- `src/data/weather.ts`, `fire.ts`: bounded NWS forecast adapter and separate validated thermal simulations.
- `src/data/reports.ts`, `reportExamples.json`: bounded original report fixtures, nullable locations/times, language/translation metadata and one supplied correction. `public/reports/` contains their generated plain-text originals.
- `src/state/`: source-aware URL/history, versioned local cache, shared refresh store and loading/freshness.
- `src/components/`: source panel, accessible details, map lifecycle/fallback.
- `public/`: bundled Natural Earth geography and notices.
- `tests/`: deterministic production-browser checks and test-only transport fixtures.

## $0 and provenance

Public core access remains free and account-free. **No billing, paid service, hosting, trial, API key or account is used.** Selecting USGS makes a direct credential-free HTTPS request to `earthquake.usgs.gov`, which receives usual connection information including the visitor's IP. Selecting NWS similarly requests `api.weather.gov` directly; no weather imagery or external icons are downloaded. No analytics, external fonts or map tiles. Demo-only exploration makes no external requests; following source links leaves the app.

NWS forecast use is independently scoped and documented in [DATA_POLICY](docs/DATA_POLICY.md); this does not extend USGS permissions to other products. Weather limits are local per page, not a global traffic allowance. USGS scientific data are published at no cost. Source-specific attribution, use/redistribution basis, coverage, cadence and rate limits are recorded in [DATA_POLICY](docs/DATA_POLICY.md). Feed requests have a 12-second timeout, 2 MB body limit and 2,000-record envelope limit; no silent truncation. At least 60 seconds between attempts, with 5-minute fallback backoff on HTTP 429 and longer exposed Retry-After respected. Cooldowns and last failure persist separately from the snapshot across reloads/tabs when storage works. No polling or automatic retry. Provider service limits are not an unlimited-traffic guarantee. Future scale must use bounded caching/throttling or disable the layer; never upgrade to a paid service.

Base geography is public-domain [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), via world-atlas 2.0.2 (Natural Earth 4.1.0, 1:110m), with local notices. Historical generalized boundaries are illustrative. Software remains `UNLICENSED` pending the owner's Apache-2.0 decision.

## Limits and next phase

No backend, deployment, automatic ingestion, service worker or offline cold-start guarantee. The loaded snapshot remains usable during network loss, but the application assets still need to load before a saved snapshot can be read. Cache is per origin/browser profile, can be evicted by the browser, and is not authenticated historical evidence. Returning to a loaded/cached USGS view requires manual refresh to check for changes. Device clock accuracy affects live windows. Regional detection/reporting gaps, provider corrections and overlapping markers remain. No clustering, Safari/Firefox or screen-reader audit.

Initial app JS is ~305 KB / 96 KB gzip, app CSS ~30 KB / 7 KB gzip. Interactive-only MapLibre is ~1.08 MB / 289 KB gzip plus a ~508 KB worker and ~83 KB CSS. Its documented chunk warning is non-failing; list/static entry avoids those downloads.

Weather covers one New York grid cell only; live fires, weather alerts, weather persistence and global weather coverage are not implemented.

Phase 5 stops here. Continue in a fresh chat using `prompts/NEXT_PHASE_KICKOFF.md` for Phase 6 digital-world measurements. Local `main` tracks the owner-authorized [G.O.S.I.P. repository](https://github.com/sebastienlato/G.O.S.I.P).
