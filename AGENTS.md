# Autonomous work — GOSIP

Read README, ROADMAP, PROJECT_STATE, DECISIONS, docs/WORKFLOW and the current phase prompt at chat start. Build working software; decide routine details autonomously. One phase per chat, then stop.

## Owner direction (Roadmap 2.0)
1. Real, live public data is the goal; web first and iOS paused. Free public core access, no mandatory account/paywall/subscription.
2. Free first: owner-created free accounts/keys are allowed. Batch the single owner actions needed, keep building unrelated work. Keys stay in ingestion secrets, never browser code or git.
3. $0 by default: never add billing, payment methods, paid tiers/trials/domains or automatic upgrades. Paid options require explicit owner approval; record useful provider/cost/benefit alternatives in DATA_POLICY without activating them.
4. Static site + scheduled server ingestion: bounded, validated source snapshots and health, official Pages Actions artifact deployment, no data commits. Browser reads same-origin JSON. Check current terms/quotas; fail closed when insufficient.
5. Review source-specific attribution, redistribution, access, identification and rate limits in ≤10 lines per new source. Take another candidate or request one owner action when blocked. This must not stall UI development.
6. Retire simulation as each real layer ships. Hide unavailable live layers and list them as coming. During transition simulations must be explicitly separate, labeled and never default. Final public product contains none; fixtures remain for tests.
7. Real clock and relative windows for real data. Every layer shows last update, stale/failure status, provenance and distinct timestamps; never empty-as-success after failure.
8. Multiple live layers share map/feed with independent toggles/freshness (Phase 13). Keep copy short; caveats in details/sources. Reports are attributed claims, not verified events. No inferred cause/casualties/corroboration; validate untrusted input.
9. Safety: no tactical real-time conflict tracking or precise vulnerable-person positions; aggregate/delay or omit sensitive movement. No secret exposure, destructive action outside this workspace, force-push or unapproved account creation.

## Workflow
- Deliver an end-to-end visible increment. Simplest maintainable implementation; no documentation-only phases, exhaustive review matrices or unnecessary backends.
- Run build/typecheck, focused core tests and browser smoke. Fix important failures; after three attempts at the same failure, change approach or isolate/defer noncritical work. Never claim failing checks pass.
- Keep docs short and factual; update PROJECT_STATE/DECISIONS for material changes.
- Finish by writing prompts/NEXT_PHASE_KICKOFF.md, committing phase changes and pushing the authorized origin/main (https://github.com/sebastienlato/G.O.S.I.P.git). Verify remote SHA and clean status. No force-push, branch deletion or visibility changes. If auth is missing, request one owner action.
- Report 5–10 lines: delivery, live URL state, checks, commit/push, needed owner actions, limitations and next prompt. Stop before the next phase.
- Never assume unlimited free hosting. Owner confirmed no payment method in Phase 12. ZERO_COST_STORAGE_CONFIRMED allows deployment; if payment settings change, require a $0 Actions budget with stop usage before continuing. No automatic upgrades; accept stale data/interruption.
