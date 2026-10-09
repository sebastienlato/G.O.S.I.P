# Native simulation explorer — view-link continuation

Open `native/GOSIP/GOSIP.xcodeproj`, select **GOSIP** and an installed iPhone or iPad simulator, and Run. Deployment target is iOS 17; verification used Xcode 27.0 and iOS 26.5. Signing is disabled. No Apple account, Developer Program enrollment, new dependency or paid service is required for this simulator workflow. Device/App Store distribution is not configured or claimed.

## What works

- All 46 canonical original fixtures, with seven separately selected sources: original examples, fire, reports, digital, space, aviation and maritime.
- Local Natural Earth map with tappable broad markers, plus a native accessible list including unknown/withheld positions. No MapKit, remote tiles, geocoding, location permission or network client. Map overlap can be resolved through the list; pan/zoom/clustering are deferred.
- 6h/24h/3d/7d windows, exact supplied country/region, bounded search, category subsets (including none), report language/correction and digital family/result filters. Country-not-supplied is independent of mapping. Source changes clear content/place/search/selection/cursor and preserve window/view.
- Source-specific details preserve publication, occurrence, interval, update, snapshot and baseline meanings; nullable measurements/units, uncertainty, coverage, provenance, original multilingual reports, author-supplied translation/correction and bundled original text. Related examples explain clearing filters and returning to the full seven-day snapshot.
- Hourly UTC simulation cursor, six-hour steps and 1.2s playback over 1–8 October 2026. Playback pauses on source/window/view/place/content/search changes, opening sheets, hiding the timeline or backgrounding; Reduce Motion disables automatic playback. Latest fixture text/full totals/plans are explicit, never an as-known archive.
- Native system controls, Dynamic Type, dark mode, About and complete bundled Apache-2.0/NOTICE/Natural Earth/world-atlas notices. No saved search, account, analytics, refresh or live-source selection. Installed resources support cold launch without an application network request; this does not change the web beta's offline limitations.

## View links

Open the link button in the navigation bar. **Share current** shows all exported filters, UTC time, matching count and privacy disclosure; **Copy view link** uses the system clipboard and **Share view link** opens the system share sheet. Search and place text are included. No selected example, camera or raw data is exported.

**Import link** accepts a pasted public beta URL, reads it entirely offline, and shows a review before **Restore this view · paused**. Editing the text invalidates the review. Cancel or invalid input leaves the current view intact. Restore clears selection, replaces filters and leaves playback paused; opening the sheet also pauses. Latest corrections/full totals/future plans remain explicit, never an archive guarantee.

Accepted address: exactly HTTPS `sebastienlato.github.io/G.O.S.I.P/`, without credentials, port or fragment. Localhost and alternate hosts/paths are rejected. Seven exact source IDs only; USGS/NWS and unknown sources fail visibly. The parser rejects duplicate keys, malformed percent/UTF-8 encoding, controls (including C1)/directional overrides, bad enumerations and noncanonical/out-of-range hourly cursors. URL ≤8,192 UTF-16 units, encoded query ≤4,096, search ≤200, country/region ≤300. It rejects rather than silently truncating imported text. Typed search strips controls and stays within 200 UTF-16 units without splitting characters.

Valid web filter semantics are preserved, including multiple/no layers, `country=~unknown` independently of mapping and report/digital source scopes. Web `map` preferences and unrelated parameters are omitted, as disclosed; the native map is always local. Content filters for another source are discarded as on the web. Unknown supplied place text remains visible/selectable and yields empty results when unmatched. Native import is deliberately stricter than the web's forgiving URL normalization. There is no automatic incoming-link registration, fetching, saved preference, account or universal-link/domain setup.

## Shared data and checks

The existing TypeScript source modules and validators remain authoritative. `scripts/export-native.mjs` loads them with the existing locked Vite dependency and exports a deterministic, versioned presentation bundle. Each record preserves its canonical ID and exact validated `raw` contract, plus generated native display sections, search corpus and canonical local report-original content. Native code consumes the bounded presentation fields; the raw payload is retained for fidelity, not a new network ingestion API. No parallel hand-authored dataset or web implementation change.

The Swift boundary rejects invalid version/source lists, duplicate IDs, oversized data/text/arrays, invalid times/coordinates, control text and invalid relationships. Build-time source validation additionally enforces the full source-specific raw schemas. Regeneration/check mode detects resource drift, including originals and notices. Do not hand-edit generated JSON/text resources. `parity.json` and `links.json` are generated test oracles from the actual web filters and query parser/serializer; Xcode ships neither in the app.

```sh
npm ci
npm run data:native             # after changing authoritative fixtures/notices/map
npm run check:native            # byte-for-byte drift check + Swift core tests
xcrun simctl list devices available
xcodebuild -project native/GOSIP/GOSIP.xcodeproj -scheme GOSIP \
  -destination 'platform=iOS Simulator,id=<installed-device-UUID>' \
  -derivedDataPath native/GOSIP/build test CODE_SIGNING_ALLOWED=NO
```

Twelve Swift tests include 133 web-link parser/serializer/filter round trips, URL/text/cursor/source boundaries and 4,732 timeline comparisons (seven sources × 169 hourly cursors × four windows), fixed counts, half-open digital boundaries, unknown-country independence, translation/correction search, reset behavior, malformed-bundle rejection, relationships and geography/notices. UI tests cover source/window/filter navigation, feed-only records, correction/related details, playback and empty-search recovery, plus link review/copy/restore, rejected-source isolation, review invalidation after editing and paused imports. Local build/test results are ignored. `generate-project.py` reproducibly regenerates the checked-in dependency-free Xcode project when its file list/settings need changing.

### Continuation verification — 8 October 2026

- Xcode 27.0 unsigned simulator build passed. Nine iPhone 17 Pro UI tests passed across the regression run and a focused rerun of two corrected tests; one iPad mini (A17 Pro) dark-mode/largest-accessibility-text review/restore test passed, both on iOS 26.5. Initial new assertions tried to read empty SwiftUI picker accessibility values; the tests now verify visible source records. The large-text test was fixed to scroll to the input before tapping. No known failing check remains.
- Inspected [iPhone share](screenshots/native-links/iphone-share.png), [import](screenshots/native-links/iphone-review.png), [rejection](screenshots/native-links/iphone-rejected.png), [restored view](screenshots/native-links/iphone-restored.png), [paused digital view](screenshots/native-links/iphone-paused.png), [iPad large-text review](screenshots/native-links/ipad-dark-large-text-review.png) and [restoration](screenshots/native-links/ipad-dark-large-text-restored.png). Historical Phase 11 screenshots remain unchanged.
- Node 26.8.1 locked install, 182 web tests, strict typecheck/root build, 14 repository-path public-host Chromium checks, native drift/12 core tests and format/diff checks passed. Existing lazy-map chunk warning remains. No web source/fixture changes or redeployment; 126 full root browser tests retain the Phase 10 baseline.

Limits: no native saved preferences or automatic inbound URL handling; UI chrome remains English; original report languages remain intact. No real-device, VoiceOver, full accessibility/security audit or old-iOS runtime claim. No live USGS/NWS/FIRMS/news/digital/movement requests. Simulator success is not App Store readiness. Keep $0 and fail closed; never purchase distribution, hosting or quota.
