# G.O.S.I.P. — Roadmap 3.0 planning (one-off, owner-authorised)

Act as autonomous lead developer in `/Users/sebastienlato/Dev/GOSIP`. Start with `git pull --ff-only`. Read AGENTS, README, ROADMAP, PROJECT_STATE, DECISIONS, docs/WORKFLOW, DESIGN, ARCHITECTURE, DATA_POLICY, BETA_READINESS and **docs/ROADMAP_3_DRAFT.md**.

## Before planning

Phase 20 sign-off is still yours: the final Claude polish pass is recorded as D64 (commit `898e3cb`, evidence in PROJECT_STATE). Verify that commit, the current HTTPS release, all eight source/health mirrors, history and artifact cleanup. If it holds, mark Phase 20 complete in ROADMAP/PROJECT_STATE. If not, fix or report honestly and stop.

## This chat's job

The owner wants the next 10–20 phases planned. AGENTS forbids documentation-only phases; **the owner authorises this one planning chat as an exception.** It still must not be only prose: include the small real increment in "Deliver" below.

The vision is unchanged: give people global intelligence with live, real public data. The owner's assessment is that the product is a long way from it, wants more features, and wants the data to be good to consume, not only present. The draft lists the gaps, a proposed data quality bar, new working rules and phases 21–38. Treat it as a proposal to test, not as instructions: challenge the order, merge or split phases, and replace candidates that fail review.

## Deliver

1. **Feasibility check of the draft.** For each candidate source in phases 21–28, a current ≤10-line review in DATA_POLICY: rights, redistribution, attribution, quota, identification, key/account need, safety. Mark each ready, needs owner action, or blocked with the next candidate. Candidates are not pre-approved. Do not create accounts, request keys or contact providers.
2. **Budget check.** Estimate published bytes per new layer and for all-source history against the 25 MB cap and the $0 Actions limits. State plainly whether phases 30–32 fit, and what the options cost if not. Do not change the cap.
3. **Roadmap 3.0.** Rewrite `ROADMAP.md` with the agreed phases 21+: one short entry each with delivery, sources, dependencies and owner input. Keep completed phases as a brief history line. Remove `docs/ROADMAP_3_DRAFT.md` once its content is absorbed, or keep it marked superseded.
4. **Working rules.** Propose AGENTS updates for owner approval: the default-view rule, the data quality bar, the work/Claude role split and design-pass cadence, and layer domains. Do not weaken any existing safety, $0, provenance or no-simulation rule.
5. **One batched owner-action list.** Every account, key, appname and decision needed across phases 21–28, with exact steps, so the owner does them once. Include the five decisions listed in the draft.
6. **Small real increment (required):** per-layer default windows so no enabled layer reads 0 in the default view because of its own delay (draft phase 21, data-quality item 1), with tests and deployment. Keep UI plain; Claude styles it in the next design pass. If this proves larger than a small increment, deliver the smallest honest part and say what remains.
7. **Phase 21 kickoff** in `prompts/NEXT_PHASE_KICKOFF.md`, written so a new chat can start it.

## Constraints

All AGENTS rules apply: $0, no billing or paid tiers, static site + scheduled ingestion, same-origin data, approved imagery hosts only, safety rules, attributed claims, no inferred cause/casualties/corroboration, no public simulations, no force-push. Preserve the D52/D55/D64 console and other contributors' commits. Native stays paused.

## Finish

Run the usual checks for the code increment (npm ci, unit, root/Pages build/typecheck, repository-path desktop/mobile smoke), commit, push authorised origin/main, verify deployment and clean status. Report in 5–10 lines: Phase 20 sign-off result, what changed in the roadmap versus the draft and why, sources ready/blocked, budget finding, the owner-action list, the increment's live state, and the next prompt. Stop before Phase 21.
