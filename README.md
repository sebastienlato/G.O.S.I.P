# G.O.S.I.P. — Global Open Source Intelligence Platform

A free, local-first global event explorer. **Phase 10 delivers a live GitHub Pages web beta with repository-path assets, Apache-2.0 licensing and tested public simulation access.** Cached USGS earthquakes and NWS New York forecasts remain available on exact loopback hosts; other hosts disable these requests with an explicit explanation. This is a prototype, not an emergency or impact assessment service.

**[Open the web beta](https://sebastienlato.github.io/G.O.S.I.P/)** · [Lightweight list](https://sebastienlato.github.io/G.O.S.I.P/?view=list) · Simulated data, free access, no account.

## Run locally

Use Node **22.12+ (22.x), 24+, or newer** and npm. Checked with Node 26.8.1.

```sh
npm ci
npm run dev
```

Open the loopback URL printed by Vite (normally http://127.0.0.1:5173). No credentials, account, backend, or environment file is needed.

## Public readiness

- **Privacy & source licenses** opens directly from the explorer: connection/URL disclosure, cache controls and cleanup, source-specific rights, local map/dependency notices, and the original-software Apache-2.0 license.
- USGS/NWS are **local-only** on exact `localhost`, `127.0.0.1` or `[::1]`. Public/LAN hostnames keep the chosen source visible but do not load cached observations or make provider requests. Choose simulations explicitly or follow the official provider link. No query parameter enables feeds. Browser cooldowns cannot cap public visitor traffic; NWS application identification also remains unresolved for a public client.
- Production CSP blocks inline scripts and unapproved connections; global no-referrer protects outgoing links. Typed and linked search share control/directional-character sanitization, preserving multilingual text. Select controls have visible keyboard focus; the privacy dialog supports narrow screens and keyboard dismissal/focus return.
- Build regenerates dependency notices from locked installed packages. `npm audit` found zero known advisories on 2026-10-08. No dependency upgrade was justified.
- [Beta readiness and limitations](docs/BETA_READINESS.md) records the deployed GitHub Pages release, actual limits and verification. **[Phase 10 beta is live](https://sebastienlato.github.io/G.O.S.I.P/)**, with HTTPS and actual desktop/mobile smoke checks passed.

## Using the web beta

Select one simulated source at a time, choose a time window and supplied country/region, then open a card or map marker for provenance and uncertainty. Use List or the static map for lighter downloads. Copy view link shares the filters; reloading or Back/Forward preserves them. These are query links on `/G.O.S.I.P/`, not separate page routes.

All public datasets are explicitly simulated. USGS/NWS selections explain the restriction and offer official live-source links. Local loopback adapters remain available for development. An empty view is not evidence that nothing happened. The fixed demo clock is 8 October 2026, 16:00 UTC; playback is not a historical archive.

GitHub Pages logs visitor IP addresses for security. Search text appears in shared URLs/history; avoid personal information. No GOSIP signup or payment is required. Hosting can be throttled or withdrawn; no unlimited availability promise or automatic paid upgrade.

## Explore

- **Space / Aviation / Maritime · simulated** (`?source=space-demo|aviation-demo|maritime-demo`): four original examples per source, independently selected. Explore a delayed aggregate, a future plan, a collection gap and an older sample. Counts are invented catalog entries, flight movements or port calls, never people, real tracks or current positions. No additional live provider is connected.
- Publication drives backward windows and newest-first order: each source has 6h=1 / 24h=2 / 3d=3 / 7d=4 at the fixed fixture clock. Details distinguish sample cutoff, half-open sample/planned/gap interval, publication, nullable update and scenario retrieval. Plans remain unobserved; missing coverage remains null, not zero. Playback shows latest fixture content, not earlier knowledge or completed movements.
- Two broad context markers and two feed-only examples per source. Supplied country/region, search (including basis and units), layer toggles, keyboard details, shared links, history, reset and map/feed actions work with all three sources. Country is not nationality; no orbital elements, object/aircraft/vessel IDs, precise positions, routes, causal links or safety guidance. Official candidate review and unresolved live-use limits are in [DATA_POLICY](docs/DATA_POLICY.md#phase-8--additional-layer-candidates-and-original-examples-2026-10-08).

- **Time & place:** scrub the simulation clock hourly across 1–8 October 2026, step six hours, or play six-hour increments every 1.2 seconds. Playback stops at the fixed snapshot, on hidden pages/history navigation, source/place/window changes, and opening details. Reduced motion disables automatic playback; stepping and keyboard slider controls remain available. Return to snapshot restores the original counts.
- Playback explores occurrence, report publication or overlapping digital intervals in the **latest fixtures**, not what was known at an earlier time. Corrections and full interval totals remain visible; intervals extending after the cursor are explicitly labeled. Visible UTC cursor/range and source coverage explain this limit. USGS week/cache snapshots and current NWS predictions have no historical playback; their live clocks and manual refresh remain unchanged.
- Country and region filters match **exact supplied labels**, including country not supplied/withheld. No reverse geocoding, inferred country/nationality or nationwide impact. A broad region can exist without a country; unknown/withheld coordinates remain feed-only. Filters apply together; clear place filters or Reset to recover empty views.
- Details now expose **Evidence & relationships**: the report’s supplied correction is one version relationship; two GOSIP-authored digital teaching comparisons explain measured drop versus near-baseline/missing samples. Each comparison identifies its fixture evidence and author and opens the related example, explicitly resetting to the full seven-day snapshot. No inferred real-event links, causal claims, recovery claims or independent corroboration. Records without supplied links say so; completeness is not claimed.
- Shared links add canonical hourly `at=<ISO UTC>`, `country=<supplied label>` (`~unknown` for missing country) and `region=<supplied label>`. Cursors are simulation-only, bounded to seven days; place text is bounded to 300 characters with control/directional characters rejected. Steps and discrete filters push history; scrub/play ticks replace it. Source switches reset cursor/place filters, retaining window/view. Selection and actual snapshots are never shared.

- **Digital world · simulated** (`?source=digital-demo`): six original scenarios covering reachability drops, web-test anomalies, missing samples, an incomplete summary and samples without anomalies. Filter by **Outage signals / Censorship measurements** and sample result; search method, result, fictional ASN, region or country. Filters survive shared links, reload and Back/Forward. No live digital feed is connected.
- Digital windows overlap measurement intervals before the fixed **2026-10-08 16:00 UTC** fixture clock, sorted by interval end: 6h = 1 / 24h = 3 / 3d = 4 / 7d = 6. Publication/update/retrieval are distinct from measurement time. Details show synthetic responding-block values and prior-day baseline, or anomalous tests and their denominator, with missing samples and absent values explicit. Tests are not people; a signal is not a confirmed outage or intentional censorship. No cause, actor, affected-user estimate or independent corroboration is claimed.
- Four broad regional markers and two unknown/withheld locations remain honest; unmapped examples stay in the feed without map actions. No probe IPs, contributor IDs, tested URLs or precise positions. Fixture network IDs use private-use ASNs and do not represent real providers. The [Phase 6 source review](docs/DATA_POLICY.md#phase-6--digital-world-source-review-2026-10-08) records OONI's CC BY-NC-SA data terms and infrastructure concerns, and unresolved IODA reuse/access limits. No digital requests, persistence, accounts, billing or backend were added.

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

“Copy view link” preserves validated source, simulation cursor, country/region, search, layers, window, report language/correction and digital family/result filters, map/list and static-map preferences. Typing replaces history; other changes push; Back/Forward restores. Selection/camera/data are not shared. Unknown parameters are removed, categories are whitelisted and search is capped at 200 characters. Clipboard failure exposes a manual copy field. Localhost links require the app at that address.

## Commands and checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Loopback development server |
| `npm run typecheck` | Strict TypeScript checking |
| `npm run build` | Typecheck and production bundle |
| `npm run preview` | Loopback production preview |
| `npm test` | 182 focused fixture/history/relationship/place/digital/report/environment/cache/refresh/parser/provider/filter/URL tests |
| `npm run test:e2e` | Build, fresh preview on port 4173, 126 desktop/mobile Chromium checks |
| `npm run format:check` / `npm run format` | Check / apply source formatting |
| `npm run test:beta` | Build repository-path release; 14 strict-static public-host desktop/mobile checks |
| `npm run build:pages` | Build for `/G.O.S.I.P/`, check files/CSP/licenses and enforce a 10 MB local release budget |
| `npm run release:pages` | Prepare from clean, pushed main; `-- --publish` separately publishes the static branch |
| `npm run data:reports` | Rebuild bundled original report source documents |
| `npm run data:notices` | Rebuild bundled production dependency notices (also runs on build) |
| `npm run data:map` | Rebuild committed local geography |

Browser tests need Chromium: `PLAYWRIGHT_SKIP_BROWSER_GC=1 npx playwright install chromium`. Port 4173 must be available. Tests intercept earthquake and weather endpoints with invented test-only responses; no check depends on live feed availability. Coverage includes success, malformed/network failure, explicit fallback/retry, stale/retained data, corrections/removal, missing values, current versus demo time, map selection, URL/history, mobile reflow, keyboard access, and map-free list/static entry. Screenshots in `docs/screenshots/` show mocked QA responses or labeled synthetic examples, never evidence of actual conditions. Phase 6 screenshots show desktop/mobile digital lists, details and maps. Tests also cover digital interval boundaries, null positions, sample denominators, safe schema rejection, URL/history, keyboard focus, 320px offline reflow and zero external/map-engine requests for list/static entries. Original report documents remain consistency-checked against fixtures. Phase 7 screenshots show timeline, relationship evidence and 320px list/static exploration; browser checks cover timer bounds/cleanup, reduced motion, keyboard scrubbing, URL/history, supplied/unknown place contexts, relationship navigation and current-source isolation.

Phase 8 checks cover all three new sources, unsafe schema inputs, publication boundaries, future plans, missing locations, playback/share/history, keyboard map focus, 320px offline access and zero external/map-engine requests in list/static views. Phase 8 screenshots are original synthetic examples.

## Structure

React 19.3, TypeScript 7.0, Vite 8.3, Tailwind 4.3 and MapLibre 6.13; dependency versions are locked.

- `src/data/additional.ts`, `additionalExamples.json`: bounded space/aviation/maritime simulations with publication windows and separate sample/plan/gap semantics. No network adapter.
- `src/data/events.ts`: discriminated demo/observation contract, unchanged demo parser/fixtures and filtering.
- `src/data/usgs.ts`: bounded USGS parser/provider, stream size limit, timeout, deduplication and cadence.
- `src/data/weather.ts`, `fire.ts`: bounded NWS forecast adapter and separate validated thermal simulations.
- `src/data/digital.ts`, `digitalExamples.json`: bounded fixture-only measurement schema, interval semantics, nullable sample counts/baselines/locations and digital filters. No live-source adapter.
- `src/data/reports.ts`, `reportExamples.json`: bounded original report fixtures, nullable locations/times, language/translation metadata and one supplied correction. `public/reports/` contains their generated plain-text originals.
- `src/data/history.ts`, `relationships.json`: bounded simulation cursors, exact supplied place filters and validated authored comparison references. `HistoryControls` and `Relationships` present controls and evidence without a new feed or cache.
- `src/state/`: source-aware URL/history, versioned local cache, shared refresh store and loading/freshness.
- `src/components/`: source panel, accessible details, map lifecycle/fallback.
- `public/`: bundled Natural Earth geography and notices.
- `tests/`: deterministic production-browser checks and test-only transport fixtures.

## $0 and provenance

Public core access remains free and account-free. **No billing, paid service, trial, API key or new account is used.** GitHub Pages is the selected free public-repository hosting path; its limits and release procedure are in [BETA_READINESS](docs/BETA_READINESS.md). On exact loopback hosts, selecting USGS makes a direct credential-free HTTPS request to `earthquake.usgs.gov`, which receives usual connection information including the visitor's IP. Selecting NWS similarly requests `api.weather.gov` directly; no weather imagery or external icons are downloaded. No analytics, external fonts or map tiles. Demo-only exploration makes no external requests; following source links leaves the app.

NWS forecast use is independently scoped and documented in [DATA_POLICY](docs/DATA_POLICY.md); this does not extend USGS permissions to other products. Weather limits are local per page, not a global traffic allowance. USGS scientific data are published at no cost. Source-specific attribution, use/redistribution basis, coverage, cadence and rate limits are recorded in [DATA_POLICY](docs/DATA_POLICY.md). Feed requests have a 12-second timeout, 2 MB body limit and 2,000-record envelope limit; no silent truncation. At least 60 seconds between attempts, with 5-minute fallback backoff on HTTP 429 and longer exposed Retry-After respected. Cooldowns and last failure persist separately from the snapshot across reloads/tabs when storage works. No polling or automatic retry. Provider service limits are not an unlimited-traffic guarantee. Future scale must use bounded caching/throttling or disable the layer; never upgrade to a paid service.

Base geography is public-domain [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), via world-atlas 2.0.2 (Natural Earth 4.1.0, 1:110m), with local notices. Historical generalized boundaries are illustrative. Original software, documentation and synthetic fixtures are [Apache-2.0 licensed](LICENSE), Copyright 2026 GOSIP contributors, under the owner’s delegated Phase 10 decision. Third-party rights remain separate. See [NOTICE](NOTICE) and [contribution guidance](CONTRIBUTING.md).

## Limits and next phase

No backend, automatic ingestion, service worker or offline cold-start guarantee. The loaded snapshot remains usable during network loss, but the application assets still need to load before a saved snapshot can be read. Cache is per origin/browser profile, can be evicted by the browser, and is not authenticated historical evidence. Returning to a loaded/cached USGS view requires manual refresh to check for changes. Device clock accuracy affects live windows. Regional detection/reporting gaps, provider corrections and overlapping markers remain. No clustering, Safari/Firefox or screen-reader audit.

Initial app JS is ~367 KB / 109 KB gzip, app CSS ~34 KB / 8 KB gzip. Interactive-only MapLibre is ~1.08 MB / 289 KB gzip plus a ~508 KB worker and ~83 KB CSS. Its documented chunk warning is non-failing; list/static entry avoids those downloads.

Weather covers one New York grid cell only; live fires, weather alerts, weather persistence and global weather coverage are not implemented.

Digital-world content is entirely synthetic; no live outage/censorship coverage or historical archive is claimed.

Phase 10 stops at the web beta boundary. Use `prompts/NEXT_PHASE_KICKOFF.md` for the next chat; no iOS work is included here. Local `main` tracks the owner-authorized [G.O.S.I.P. repository](https://github.com/sebastienlato/G.O.S.I.P).
