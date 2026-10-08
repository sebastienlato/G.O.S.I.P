# Native simulation explorer — Phase 11

Open `native/GOSIP/GOSIP.xcodeproj`, select **GOSIP** and an installed iPhone or iPad simulator, and Run. Deployment target is iOS 17; verification used Xcode 27.0 and iOS 26.5. Signing is disabled. No Apple account, Developer Program enrollment, new dependency or paid service is required for this simulator workflow. Device/App Store distribution is not configured or claimed.

## What works

- All 46 canonical original fixtures, with seven separately selected sources: original examples, fire, reports, digital, space, aviation and maritime.
- Local Natural Earth map with tappable broad markers, plus a native accessible list including unknown/withheld positions. No MapKit, remote tiles, geocoding, location permission or network client. Map overlap can be resolved through the list; pan/zoom/clustering are deferred.
- 6h/24h/3d/7d windows, exact supplied country/region, bounded search, categories, report language/correction and digital family/result filters. Country-not-supplied is independent of mapping. Source changes clear content/place/search/selection/cursor and preserve window/view.
- Source-specific details preserve publication, occurrence, interval, update, snapshot and baseline meanings; nullable measurements/units, uncertainty, coverage, provenance, original multilingual reports, author-supplied translation/correction and bundled original text. Related examples explain clearing filters and returning to the full seven-day snapshot.
- Hourly UTC simulation cursor, six-hour steps and 1.2s playback over 1–8 October 2026. Playback pauses on source/window/place/content/search changes, opening sheets, hiding the timeline or backgrounding; Reduce Motion disables automatic playback. Latest fixture text/full totals/plans are explicit, never an as-known archive.
- Native system controls, Dynamic Type, dark mode, About and complete bundled Apache-2.0/NOTICE/Natural Earth/world-atlas notices. No saved search, account, analytics, refresh or live-source selection. Installed resources support cold launch without an application network request; this does not change the web beta's offline limitations.

## Shared data and checks

The existing TypeScript source modules and validators remain authoritative. `scripts/export-native.mjs` loads them with the existing locked Vite dependency and exports a deterministic, versioned presentation bundle. Each record preserves its canonical ID and exact validated `raw` contract, plus generated native display sections, search corpus and canonical local report-original content. Native code consumes the bounded presentation fields; the raw payload is retained for fidelity, not a new network ingestion API. No parallel hand-authored dataset or web implementation change.

The Swift boundary rejects invalid version/source lists, duplicate IDs, oversized data/text/arrays, invalid times/coordinates, control text and invalid relationships. Build-time source validation additionally enforces the full source-specific raw schemas. Regeneration/check mode detects resource drift, including originals and notices. Do not hand-edit generated JSON/text resources. `parity.json` is a test oracle generated from the actual web filter; Xcode does not ship it in the app.

```sh
npm ci
npm run data:native             # after changing authoritative fixtures/notices/map
npm run check:native            # byte-for-byte drift check + Swift core tests
xcrun simctl list devices available
xcodebuild -project native/GOSIP/GOSIP.xcodeproj -scheme GOSIP \
  -destination 'platform=iOS Simulator,id=<installed-device-UUID>' \
  -derivedDataPath native/GOSIP/build test CODE_SIGNING_ALLOWED=NO
```

Eight Swift tests include 4,732 comparisons (seven sources × 169 hourly cursors × four windows), fixed counts, half-open digital boundaries, unknown-country independence, translation/correction search, reset behavior, malformed-bundle rejection, relationships and geography/notices. UI tests cover source/window/filter navigation, feed-only records, correction/related details, playback and empty-search recovery. Phase-specific screenshots live in `docs/screenshots/phase11/`; local build/test results are ignored. `generate-project.py` reproducibly regenerates the checked-in dependency-free Xcode project when its file list/settings need changing.

Limits: no native saved/shared view links or inbound URL handling yet; UI chrome remains English; original report languages remain intact. No real-device, VoiceOver, full accessibility/security audit or old-iOS runtime claim. No live USGS/NWS/FIRMS/news/digital/movement requests. Simulator success is not App Store readiness. Keep $0 and fail closed; never purchase distribution, hosting or quota.
