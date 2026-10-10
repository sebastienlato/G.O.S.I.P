# Trigger-only Worker

Paste `worker.mjs` into the existing Worker dashboard; retain the encrypted secret and expiry. Setup is already complete; instructions and renewal are in docs/ROADMAP_3_OWNER_ACTIONS.md. No HTTP handler, storage or public route. Do not export plain constants from this entry point. Workers fetch supports `manual` redirects; response checks reject non-success/204 without following a Location or forwarding credentials.

`npm test` includes Node unit tests and real workerd scheduled tests. The pinned stable Miniflare test runtime supports compatibility date 2026-08-06; deployed compatibility date is 2026-10-10. Tests use only a test token and intercepted outbound requests, never production credentials/provider calls. Scoped sharp/undici overrides keep this development harness patched; npm audit must remain clean. A passing mock is not production evidence: verify actual Cron outcome, GitHub external-input run, build/deploy/cleanup and live stamp separately.
