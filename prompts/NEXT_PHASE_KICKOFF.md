# G.O.S.I.P. — Phase 13: global live hazards and multiple layers

Act as autonomous lead developer in /Users/sebastienlato/Dev/GOSIP. Read AGENTS.md, README.md, ROADMAP.md, PROJECT_STATE.md, DECISIONS.md, docs/WORKFLOW.md, docs/ARCHITECTURE.md, docs/DATA_POLICY.md and docs/BETA_READINESS.md; inspect git status/log/remotes. Phase 12 implements the live foundation. Native iOS and the old pan/zoom kickoff are paused/superseded. One phase only.

## Actual foundation

- Public URL https://sebastienlato.github.io/G.O.S.I.P/ ; default live USGS M2.5+ past-week earthquakes, real device clock, source details, same-origin snapshots. Separate labeled simulation lab remains; seismic demo hidden. Native resources unchanged.
- ingest/usgs.ts reuses parseUSGS/compact validation. Fixed provider and last-good URLs, 12-second request, 2 MB/2,000 records, no successful empty/malformed/stale feed. Failure retrieves/revalidates last-good public copy and preserves original times; if unavailable exposes failed/null. health.json mirrors health embedded atomically with usgs.json. Generated data ignored, never committed.
- Browser polls the same-origin combined snapshot every 15 minutes while visible/online; one-minute manual cooldown. Stale after failure or 45 minutes from original generation/retrieval. No direct USGS fetch/localStorage use. NWS existing point-forecast transport is local development only; do not confuse it with new public alerts.
- .github/workflows/pages.yml: official pinned Pages Actions, main relevant pushes/manual/15-minute UTC schedule, public-repo guard, standard Linux, no dependency cache, timeouts/concurrency, 4 MB site cap, artifact accumulation check, one-day expiry/current-run cleanup. Pages is workflow-based; gh-pages unchanged. Owner confirmed no payment method and ZERO_COST_STORAGE_CONFIRMED=true. If payment settings change, require $0 Actions budget with stop usage; never create billing. Schedule delay/drop and 60-day inactivity disable are real limitations.
- Phase 12 deployment verified: run 37866336402, source 88f9ad0acd50518b42960b1b7a0a7549ec47c8ab, 309 real USGS records, health ok; actual desktop/mobile HTTPS smoke passed and artifact cleanup left zero run artifacts. Final docs commit is newer; scheduled jobs use latest main. Read PROJECT_STATE/BETA_READINESS and recheck actual state; do not infer later success. Test: npm test, npm run build, npm run test:beta. Current 191 unit and 18 desktop/mobile repository-path checks. Historical direct-provider/default-demo suites are retired behavior, not current checks.

## Deliver this phase

1. Replace one-live-source selection with independent live layer toggles and combined map/feed. Keep source-specific freshness, attribution, meaningful times, counts, empty/failure states, safe details and shareable validated filter state. Simulations never merge with live layers.
2. Add at least one useful global hazard source after a brief current official terms/access/redistribution/quota review. Candidates: NASA EONET, GDACS, EMSC, NWS active alerts (US), NOAA NHC tropical cyclones, USGS/Smithsonian volcano notices. Choose the simplest lawful free sources; candidates are not approvals. No exhaustive matrix.
3. Extend pluggable ingestion/snapshot health contracts with bounded source adapters, identification where required, retained stale data and same-origin-only browser transport. Preserve null/uncertain values and source semantics; do not equate alerts, sensor observations and reported events. No implied corroboration between sources.
4. Retire simulated counterparts for shipped live layers; unsupported live layers stay hidden/coming. Short UI copy with detail/source caveats.
5. Keep whole artifact under the verified budget, no data commits, no paid infrastructure. Free keys/accounts are allowed only when owner creates them; batch one-action requests and work on other parts meanwhile. NASA FIRMS key belongs to Phase 14, not this phase.

## Finish

Run focused adapter/combined-filter tests, build/typecheck and desktop/mobile browser smoke, then authorized deployment and live verification. After three attempts at the same failure change approach/defer only noncritical work; never claim failures pass. Update short docs, write Phase 14 kickoff, commit/push authorized origin/main https://github.com/sebastienlato/G.O.S.I.P.git (no force push/deletions/visibility changes), verify remote SHA/clean status. Report 5–10 lines including actual live state/limits/owner actions, then stop before Phase 14.
