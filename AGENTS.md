# Autonomous work — GOSIP

Read README, ROADMAP, PROJECT_STATE, DECISIONS, docs/WORKFLOW and the current phase prompt at chat start. Build working software; decide routine details autonomously. One phase per chat, then stop.

## Owner direction (Roadmap 2.0)
1. Real, live public data is the goal; web first and iOS paused. Free public core access, no mandatory account/paywall/subscription.
2. Free first: owner-created free accounts/keys are allowed. Batch the single owner actions needed, keep building unrelated work. Keys stay in ingestion secrets, never browser code or git. Browser exception: the URL-restricted Cesium ion browser token, supplied at build time from the Actions variable `CESIUM_ION_TOKEN` (D52); never commit it. Owner D67 separately permits only the repository-scoped, 90-day Actions dispatch token in a Worker encrypted secret for the approved trigger; ingestion keys still stay in Actions.
3. $0 by default: never add billing, payment methods, paid tiers/trials/domains or automatic upgrades. Paid options require explicit owner approval; record useful provider/cost/benefit alternatives in DATA_POLICY without activating them.
4. Static site + scheduled server ingestion: bounded, validated source snapshots and health, official Pages Actions artifact deployment, no data commits. Browser reads same-origin JSON for all data. Exception (D52): the globe may load imagery/terrain/3D tiles directly from the CSP-listed providers (Esri, NASA GIBS, Cesium ion); add a provider only with a terms review, a Privacy update and a CSP entry. Check current terms/quotas; fail closed when insufficient.
5. Review source-specific attribution, redistribution, access, identification and rate limits in ≤10 lines per new source. Take another candidate or request one owner action when blocked. This must not stall UI development.
6. Retire simulation as each real layer ships. Hide unavailable live layers and list them as coming. During transition simulations must be explicitly separate, labeled and never default. Final public product contains none; fixtures remain for tests.
7. Real clock and relative windows for real data. Every layer shows last update, stale/failure status, provenance and distinct timestamps; never empty-as-success after failure.
8. Multiple live layers share map/feed with independent toggles/freshness (Phase 13). Keep copy short; caveats in details/sources. Reports are attributed claims, not verified events. No inferred cause/casualties/corroboration; validate untrusted input.
9. Safety: no tactical real-time conflict tracking or precise vulnerable-person positions; aggregate/delay or omit sensitive movement. No secret exposure, destructive action outside this workspace, force-push or unapproved account creation.

**Useful default view.** Each feature phase improves the first visit to the globe console without a required toggle: useful data, discoverability, explanation or honest coverage/freshness. A hidden toggle alone is insufficient. Never force a source on merely to inflate counts, override saved all-off/subsets, hide failure, or invent records when legitimately empty. An unavailable source remains Coming; a connected source with no matching records explains its scope/window.
>
**Layer quality.** Before publication, a layer must meet the ten checks below. Unknown/not-applicable is acceptable when explained; false precision or a fabricated trend is not. Existing layers migrate incrementally, without relabelling current limitations as passed.

1. Default window fits the source delay/cadence and states whether it looks back, forward or at a reporting period. Keep the real clock; no automatic slide to last-good data and no non-empty guarantee during outage/quiet periods.
2. Global coverage or its actual scope is visible in the layer row; missing data is not absence of activity.
3. Headline value has a unit and denominator/coverage. A comparable previous-period value/trend ships once enough genuine history exists; show “history collecting”, “incomparable” or “not applicable” beforehand. Forecasts, population stocks and measurements cannot share a generic event-count trend.
4. Rank within compatible record kinds using supplied magnitude/severity/alert level; schedules soonest, aggregates after individual records. Never create a cross-domain threat score or infer significance from report repetition. Selection stays reachable.
5. One plain sentence says what each type means and does not establish; longer caveats in details/sources.
6. Preserve supplied country/region; absent stays unknown. Country anchors are context, never inferred occurrence/impact or vulnerable-person positions.
7. Occurrence/validity, publication/provider update and retrieval are distinct where supplied; unknown says unknown. Capture/build/attempt times never replace source times.
8. Original source link and applicable licence/credit/change notices remain reachable from every record; keep incompatible data licences separate from software.
9. State provider cadence, pipeline target and safety delay separately from measured age, validity expiry, failure/staleness. “Target” never promises the next publication. Retrieval success does not prove current curation.
10. Document and link the exact same-origin JSON consumed by the page, with schema/coverage/licence and bounded download size. Export only redistributable fields; no raw sensitive inputs or secrets.


## Workflow
- Other contributors (the owner, Claude design passes) may push between phases. Start every chat with `git pull --ff-only`; never rewrite or revert their commits without owner approval. Follow docs/DESIGN.md for any UI work: the product is the 3D satellite globe console (D52); new layers render on the globe, never as a flat-map or landing-page layout.
- Deliver an end-to-end visible increment. Simplest maintainable implementation; no documentation-only phases, exhaustive review matrices or unnecessary backends.
- Run build/typecheck, focused core tests and browser smoke. Fix important failures; after three attempts at the same failure, change approach or isolate/defer noncritical work. Never claim failing checks pass.
- Keep docs short and factual; update PROJECT_STATE/DECISIONS for material changes.
- Finish by writing prompts/NEXT_PHASE_KICKOFF.md, committing phase changes and pushing the authorized origin/main (https://github.com/sebastienlato/G.O.S.I.P.git). Verify remote SHA and clean status. No force-push, branch deletion or visibility changes. If auth is missing, request one owner action.
- Report 5–10 lines: delivery, live URL state, checks, commit/push, needed owner actions, limitations and next prompt. Stop before the next phase.
- Never assume unlimited free hosting. Owner confirmed no payment method in Phase 12. ZERO_COST_STORAGE_CONFIRMED allows deployment; the whole-site cap is 25 MB (D52); if payment settings change, require a $0 Actions budget with stop usage before continuing. No automatic upgrades; accept stale data/interruption.

**Work and Claude.** Work/GPT owns ingestion, source/access review, semantics, features, tests, deployment and evidence. It supplies plain functional UI within DESIGN.md. Claude owns visual design and interaction polish using the same contracts; Work verifies semantic/regression checks after the pass. Neither may change safety/data meaning or overwrite another contributor's commits. No unseen pass is credited as complete; absent Claude availability does not block independent safe implementation, but the outstanding review stays explicit.
>
**Design cadence.** Arrange an initial grouped-layer/Auto-window pass with Phase 21, then one after every two feature phases, at most three only if the owner chooses. Each covers 1440×1000, 390 and 320, default/selected/all-off/stale/empty, keyboard focus and globe/list/static. The owner coordinates Claude unless separately authorising another chat/tool. A pass accompanies a visible increment; it is not a documentation-only phase.
>
**Domains.** Use Earth, Sky & Space, Sea & Air, Digital, People, Reports to group controls as layers grow; independent toggles/health remain. Earth = quakes/hazards/thermal/weather/air quality; Sky & Space = forecasts and schedules; Sea & Air = ports/airport status; Digital = network measurements/signals; People = country population/health context; Reports = attributed publications. Economy/energy grouping needs an explicit design decision at Phase 36. Categories/domains are navigation, not evidence relationships or shared severity. Never replace the 3D globe with a flat map/landing page.
