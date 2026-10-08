# Project state — Phase 0

- Roadmap: 1.0; Phase 0 complete and pushed to GitHub, 2026-10-08.
- Delivered: responsive React/TypeScript/Vite/Tailwind explorer; MapLibre with bundled geography and clickable static fallback; 18 explicitly simulated events across five categories; search, category toggles, four time windows, event details with provenance/timestamps/coverage, keyboard support, and mobile/list views.
- Snapshot: 2026-10-08 16:00 UTC, fixed. Default 24h shows 12 events; 7d shows 18.
- Sources: synthetic events only. Bundled Natural Earth 4.1.0 geography is public domain; terms and world-atlas notice recorded in `public/`. No live feed approved.
- Costs/services: $0; no billing, paid services, accounts, backend, analytics, deployment, or runtime external data requests.
- Checks: production build + strict typecheck pass; 17 Vitest tests pass; 10 Playwright production-preview checks pass (desktop and Chromium mobile emulation, including 320px reflow, keyboard/focus, markers, filters, map-data failure, WebGL failure and network loss); formatting check passes. Local Vite launch and visual desktop/mobile checks completed. Screenshots in `docs/screenshots/`.
- Build warning: lazy MapLibre chunk ~1.04 MB minified / 282 KB gzip, separate worker ~508 KB. Warning retained and documented; build succeeds.
- Limitations: coarse/historical borders, small synthetic coverage, fixed rather than live freshness; no clustering, persistence or offline cold-start guarantee; no Safari/Firefox or screen-reader audit. Original software license still awaits owner confirmation.
- Git: Phase 0 implementation commit `2ce4434` pushed successfully to the owner-authorized `https://github.com/sebastienlato/G.O.S.I.P.git`. Local `main` tracks `origin/main`. No force-push or previous-repository deletion was performed.
- Next: Phase 1 explorer polish in a new chat using `prompts/NEXT_PHASE_KICKOFF.md`. Do not start Phase 1 in this chat.
