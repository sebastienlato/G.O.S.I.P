# Project state — Phase 1

- Roadmap: 1.0; Phase 1 explorer polish complete, 2026-10-08. Stop here; Phase 2 belongs in a fresh chat.
- Delivered: persistent selected-event context and marker/feed highlighting; explicit regional map focus and feed focus; full-width list mode; controls before results; larger mobile controls, cooperative map gestures and single-page scrolling; clearer filter summary and targeted empty-state recovery.
- Sharing: validated URL search/layers/window/view/static-mode state, reload and Back/Forward, copy link with manual clipboard fallback. No selected-event/camera persistence or server storage. Local links require the app at the same address.
- Data unchanged: 18 original SIMULATED fixtures; fixed 2026-10-08 16:00 UTC snapshot. Default 24h = 12 events, 7d = 18. Provenance, timestamps, uncertainty, coverage and approximate locations retained. Natural Earth notices unchanged; no real feed approved.
- Cost/services: $0; no new service, account, billing, API, backend, analytics, deployment, or runtime external requests.
- Checks: production build/strict typecheck, 21 core tests, all 16 desktop/mobile Chromium browser checks, formatting and diff checks pass. Browser coverage includes map focus, selection, URL/history, invalid links, copy fallback, no-map downloads on list/static entry, 320px reflow, keyboard focus, map-data/WebGL failure, and network loss. Visual map/list checks completed; Phase 1 screenshots in `docs/screenshots/`.
- Loading: app JS ~257 KB / 81 KB gzip; app CSS ~28 KB / 7 KB gzip. Interactive-only MapLibre ~1.08 MB / 289 KB gzip, worker ~508 KB, CSS ~83 KB. Large-chunk warning remains non-failing; list/static entry avoids these map downloads.
- Limits: coarse historical borders, small synthetic coverage, no live freshness, clustering, backend, deployment, service worker or offline cold-start guarantee. No Safari/Firefox or full assistive-technology audit. Software license remains `UNLICENSED`, Apache-2.0 proposal awaiting owner confirmation.
- Git: `main` tracks the owner-authorized `https://github.com/sebastienlato/G.O.S.I.P.git`; routine phase commit/push authorized. The final phase report records the delivered commit and verified push.
- Next: first lawful earthquake feed, with visible source/freshness and explicit demo fallback. Ready-to-paste prompt: `prompts/NEXT_PHASE_KICKOFF.md`.
