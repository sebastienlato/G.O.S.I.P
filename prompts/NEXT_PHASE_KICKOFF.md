# G.O.S.I.P. — Optional continuation: native map navigation

Act as autonomous lead developer in `/Users/sebastienlato/Dev/GOSIP`. Read AGENTS.md, README.md, ROADMAP.md, PROJECT_STATE.md, DECISIONS.md, docs/WORKFLOW.md, docs/ARCHITECTURE.md, docs/DATA_POLICY.md, docs/IOS.md and docs/BETA_READINESS.md first. Inspect status/log/remotes. Original phases 0–11 and the native view-link continuation are complete. This optional milestone has not been started.

## Actual state

- Native SwiftUI app: `native/GOSIP/GOSIP.xcodeproj`, GOSIP scheme, iOS 17 target, signing disabled. Latest local verification used Xcode 27.0/iOS 26.5 iPhone 17 Pro and iPad mini simulators. Reinspect available tools/devices; never assume IDs or older-OS support. No Apple account or paid enrollment.
- All 46 original examples in seven separate sources. Local Natural Earth map/tappable broad markers, full native list, filters, details/originals/translation/correction/relationships and hourly simulation timeline. New View links sheet copies/system-shares a reviewed current view or locally validates a pasted public-beta URL before explicit paused restoration. Search/place privacy is shown. Categories now support any subset, including none. No native network/location client, persistence, automatic inbound link handling or live-source picker.
- `ViewLink.swift` uses the web query contract. Only HTTPS `sebastienlato.github.io/G.O.S.I.P/` without credentials/port/fragment is accepted. Exact simulation IDs only; malformed/unsafe/oversized/duplicate parameters and live sources fail visibly. Source-inapplicable content and unrelated parameters are omitted; web map mode does not change the native local map. Restoration clears selection and pauses playback. Map/list changes and opening dialogs pause playback too.
- TypeScript validators/fixtures remain authoritative. `npm run data:native` exports deterministic contracts/IDs/display fields, originals/map/notices and test oracles. Do not hand-edit generated resources. `npm run check:native` checks drift and 12 Swift tests, including 4,732 timeline/filter comparisons and 133 web-link parser/serializer/filter comparisons. `parity.json` and `links.json` are not shipped by Xcode. Regenerate its source list with `native/GOSIP/generate-project.py`.
- Simulator verification, limits and continuation screenshots are in docs/IOS.md and docs/screenshots/native-links/. Preserve historical captures. No real-device, VoiceOver/full accessibility, older-runtime or App Store claim.
- Web implementation/deployment unchanged: https://sebastienlato.github.io/G.O.S.I.P/ ; release source `aeb99878722e0ef3281970397f360a046258ee2a`, static branch `6bac523599f604fd3e7c2f6e7e4b3bed083b494d`. Later main/native commits do not need deployment. Do not put native files on gh-pages.
- Existing authorized remote: `https://github.com/sebastienlato/G.O.S.I.P.git`, main. Routine commits/pushes authorized; no force push, remote/visibility change or paid resource. Apache-2.0 original code/docs/fixtures; independent map/dependency/provider rights remain.

## Suggested visible milestone

Add bounded native map pan/zoom and an accessible reset-to-world action using the existing offline geometry. Keep broad markers, full list access and explicit map context. Decide routine details autonomously. Do not introduce MapKit, remote tiles, geocoding, location permission or a service. Keep camera state local and absent from shared links. If gesture/overlap complexity grows, prefer a useful bounded implementation and explicit controls. Include an end-to-end simulator flow and focused accessibility checks, not a documentation-only milestone.

## Preserved contracts

Strict $0 spending and charges, no account, credential, enrollment, billing, paid distribution, infrastructure or domain. Free core access. Fixed fixture snapshot `2026-10-08T16:00:00.000Z`; history starts exactly 168 hours earlier, hourly cursor, six-hour steps/play every 1.2s. Pause on navigation/filter/dialog/background and Reduce Motion. Latest corrections/full totals/future plans are not as-known history. Preserve original counts, all source arrays, canonical IDs, publication/occurrence/half-open digital interval semantics, nulls/units and broad/withheld positions. Country supplied labels stay exact and independent of mapping. No real tracks, sensitive positions, cause/recovery/corroboration or unobserved-plan inference.

Web USGS/NWS remain exact-loopback-only with unchanged limits/cache/cadence/failure coordination and real clocks. No public source-enable override or additional feed approval. Missing optional tools must not trigger spending or stall fixture-backed local work.

## Verify and finish

Use supported Node and `npm ci`; last checked 26.8.1. Run strict build/typecheck, focused core/native tests, available unsigned Xcode/simulator checks and inspect new screenshots. Last continuation: 182 web tests and 14 repository-path Chromium checks; 126 full root checks last passed Phase 10, rerun when web changes warrant it. After three attempts at one failure change approach; never claim failure passed.

Update concise project state/decisions/native docs and this kickoff. Commit all milestone work, push authorized main, verify remote SHA and clean status. No live deployment requested. Report limitations and stop; do not begin another milestone.
