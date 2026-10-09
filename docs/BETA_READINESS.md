# Live public layers — Phase 13

Public URL: https://sebastienlato.github.io/G.O.S.I.P/ . Existing PUBLIC repository, HTTPS, no custom domain. Pages source changed from legacy branch to GitHub Actions through the authenticated API; gh-pages preserved at `6bac523599f604fd3e7c2f6e7e4b3bed083b494d`.

## Verified $0 path (2026-10-08)

- [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions): standard runners in public repositories and Pages are free; larger runners are always chargeable. Use standard ubuntu-latest only; no cache or paid service. Artifact storage shares the account allowance (GitHub Free: 500 MB), so public runner eligibility alone does not guarantee storage headroom. **Owner confirmed no payment method.** ZERO_COST_STORAGE_CONFIRMED=true records this; if payment settings change, establish a $0 Actions budget with stop usage or disable deployment. Never raise paid budgets to restore service.
- [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits): public repo eligible; 1 GB published site, soft 100 GB/month bandwidth, 10-minute deployment timeout. Custom Actions exempt from ordinary 10-build/hour limit. Throttling/withdrawal possible; no reliable global traffic meter or unlimited-scale promise. Host logs IPs; no user accounts/transactions/analytics.
- [Scheduling](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule): minimum five minutes; delay/drop possible, especially hour boundaries; latest default branch only; public schedules disable after 60 days without repo activity. We use 7/22/37/52 UTC minutes. Re-enable manually in Actions after inactivity; do not create fake commits to evade policy. UI staleness keeps working when jobs stop.
- [Official artifact action](https://github.com/actions/upload-pages-artifact): one-day retention, bounded 4 MB site (currently ~2.94 MB), no dependency cache, delete only this run's temporary artifact after deployment. A repository guard stops uploads above 100 MB retained artifacts/100 artifacts. Cancellation may leave an artifact until one-day expiry. Other repositories/packages share account storage; no account-wide capacity guarantee. No-payment/$0-budget protection is mandatory.

## Release procedure

1. Confirm public repository, unchanged authorized remote, owner $0 safeguard and workflow guard. No visibility/billing/domain changes.
2. `npm ci`, `npm test`, `npm run build`, `npm run test:beta`. Beta tests mock snapshots on a reserved public hostname at the real repository path; never fetch test observations from a provider. Read screenshots.
3. Commit/push main; relevant changes trigger the workflow. Or `npm run release:pages` / manual Actions dispatch. Do not use branch publishing or commit generated data.
4. Verify Actions build, deploy and artifact cleanup; read release.json source SHA, usgs.json, eonet.json and health.json. Run `node scripts/verify-live-pages.mjs <actual-URL> <source-SHA>`; inspect screenshots. An accepted dispatch or pushed commit is not successful deployment.
5. For source trouble, retain stale data with honest health. For terms/quota/billing trouble disable workflow/unpublish; never purchase capacity. Roll back code with an ordinary commit and redeploy, preserving history.

## Checks and remaining limits

206 unit tests and 22 repository-path desktop/mobile checks passed locally; root build/typecheck passed. The old direct-provider/default-demo browser suites describe retired behavior and are not the current release checks. No Safari/Firefox/full accessibility audit claim. Lazy MapLibre chunk warning remains; list/static entry avoids it. No native validation is claimed for Phase 12.

CSP blocks provider USGS requests and unapproved connections; local development NWS remains allowed by CSP but host-gated. No-referrer preserved. Pages controls response headers/CDN cache; no custom frame-ancestors/nosniff/Permissions-Policy header guarantee. Client freshness is based on original data times, never HTTP cache time. Simulation lab persists during transition; default live view has no invented observations. Independent USGS/EONET toggles are shipped in Phase 13; real archive remains future work.

## Historical Phase 12 published verification

Actions run [37866336402](https://github.com/sebastienlato/G.O.S.I.P/actions/runs/37866336402) succeeded: build, deployment and cleanup. Live release.json matches `88f9ad0acd50518b42960b1b7a0a7549ec47c8ab`. Pages API: built/workflow/HTTPS, unchanged URL. Public data and health agree: 309 real records, provider generation 2026-10-09 00:44:16 UTC, retrieval 00:45:13 UTC (October 8 owner timezone), status ok. No test data substituted. Desktop/mobile HTTPS smoke passed for interactive/static maps, list, details, privacy, reload, no overflow and no external data requests. Screenshots in ignored test-results/live inspected. Temporary artifact count for the run is zero after cleanup; one-day retention remains the cancellation fallback. No remaining owner action.

Scheduled timing itself is not guaranteed or proven by one push-triggered run. Default live view is USGS only; other live layers and a real historical archive remain future work. Old source-less simulation links now open live USGS; explicit source=demo links preserve simulation intent. Final docs commit is newer than this verified release; future scheduled deployments use latest main.

## Phase 13 candidate

NASA EONET storms/volcanoes joins USGS with independent toggles and same-origin bounded snapshots. Provider metadata rights/access/scope are in DATA_POLICY (8 lines); no key/account/payment. Flood/landslide integration was deferred after the initial response exceeded bounds and supplied invalid polygon coordinates. First successful local ingestion: 309 USGS + 17 EONET entries, both health ok. EONET supplies no generation time; freshness means retrieval only. Source-specific dates, nulls, stale/failure/empty states and no corroboration are explicit.

206 unit tests, root/Pages typecheck-build, 22 repository-path desktop/mobile checks and screenshot inspection passed during implementation. Candidate ~2.94 MB under the unchanged 4 MB cap. Actual Phase 13 deployment evidence will be recorded after commit/push and HTTPS verification; prior release evidence above is historical. No native changes, paid services or owner action.
