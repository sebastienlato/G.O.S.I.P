# Low-friction phase workflow

1. Open same folder in Work with Astra High; start a **fresh chat** per phase.
2. Paste phase prompt from `prompts/PHASE_0_KICKOFF.md` or previous phase's `prompts/NEXT_PHASE_KICKOFF.md`.
3. Work implements whole milestone, runs meaningful tests, fixes failures, updates concise docs, commits and pushes to authorized remote.
4. Work writes and pushes a ready-to-paste next-chat prompt. Stop at phase boundary.

**Testing:** build/typecheck plus targeted feature tests; browser smoke if available. No exhaustive edge-case loops. Three tries at same problem before changing approach; report any remaining critical failure honestly.

**Git:** initialize fresh repo if necessary. Push to authorized configured remote after each phase, without asking again for routine push. If no remote or auth exists, request one-time setup; never invent remote or claim push. Never force push, delete the old repo, or touch other directories without explicit scope.

**Report:** 5-10 lines: features, checks, limitations, SHA/remote status, next prompt path.

**Cost check:** Before adding any provider or deployment, confirm no billing or charges can occur. If uncertain, keep it local and use fixtures. Public use remains free.

Roadmap 3.0 planning was a one-off owner-authorised exception, with a deployed Auto-window increment. Future phases still deliver visible software. The exact [AGENTS additions](AGENTS_3_PROPOSAL.md) and two-feature-phase Claude cadence were approved/applied 2026-10-10 (D70). [One owner-action list](ROADMAP_3_OWNER_ACTIONS.md) covers setup/decisions; do not request the same action again after it is completed.
