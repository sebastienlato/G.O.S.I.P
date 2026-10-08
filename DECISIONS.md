# Decisions

- D1: Global free-access public-information platform; worldwide coverage gaps clearly labeled.
- D2: Web-first React + TypeScript + Vite + Tailwind + MapLibre; native SwiftUI later.
- D3: Deterministic processing first; AI deferred.
- D4: Apache-2.0 proposed for original software; confirm copyright holder and add canonical license when ready. Third-party data licenses are separate.
- D5: **Strict zero-cost mandate:** $0 development and intended operation, free public access without accounts/paywalls, no billing-enabled or paid services, and no surprise charges. When quotas are reached, throttle, cache, disable a layer or fall back rather than pay. Free-tier availability is not a guarantee of unlimited scale.
- D6: Autonomous Astra High development, one fresh chat per phase, automatic authorized GitHub push and next prompt.
- D7: Synthetic fixtures unblock building; real feeds require source-specific legal/use review before public redistribution.
- D8: Small, purposeful tests and documentation; no redundant gate bureaucracy.
- D9 (Phase 0): Bundle public-domain Natural Earth geography via world-atlas; no tile provider or runtime external requests. Preserve notices and clip spherical dateline seams when generating GeoJSON. Use a clickable local SVG plus the feed when MapLibre cannot render.
- D10 (Phase 0): Fix demo time at 2026-10-08 16:00 UTC. All 18 events are explicitly synthetic, regionally approximate, runtime-validated, and independent of the user's current clock. No live feed approved.
- D11 (Phase 0): Use a static client and native detail dialogs; no backend, credentials, persistence, or service worker. Defer clustering until event density warrants it. Explicitly bundle the MapLibre 6 module worker through Vite.
- D12 (Phase 0): Initialize a new local `main` repository in this fresh workspace. The owner subsequently authorized `https://github.com/sebastienlato/G.O.S.I.P.git` as `origin`; `main` was pushed and now tracks `origin/main`. Do not delete prior repositories or force-push. Original software remains `UNLICENSED` pending the D4 owner decision.
- D13 (Phase 1): Separate persistent event selection from transient detail dialogs. Camera movement requires an explicit “Show on map” action, uses a regional zoom with no animation, and preserves static-map selection. Filtering out the selected event clears it. No clustering for 18 fixtures.
- D14 (Phase 1): Persist only validated filters/view/map preference in the URL. Bound search length, whitelist categorical values, normalize links, replace history for typing and push discrete changes. No local storage, selected-event deep links, or backend. Copy fallback exposes the link for manual copying; localhost links require a local instance.
- D15 (Phase 1): Load MapLibre JS/CSS/worker only when interactive map mode mounts. Direct list/static links avoid them. Keep the documented large-chunk warning, full-width list layout, single-page mobile scrolling, cooperative map gestures, and existing bundled geography/fallback.
