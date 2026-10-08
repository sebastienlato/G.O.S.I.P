# Contributing to GOSIP

GOSIP's public core stays free, with no mandatory account, payment or subscription. The web beta explores original simulations; it is not a real-time global monitoring or emergency service. See README for usage and local setup.

Original code, documentation and synthetic fixtures use [Apache-2.0](LICENSE), Copyright 2026 GOSIP contributors. Contributions intentionally submitted for inclusion use the same license unless explicitly stated otherwise. Keep third-party notices and source-specific rights separate; do not submit content you cannot license.

Use the Node version in README, run `npm ci`, then `npm run dev`. For a change, run `npm test` and `npm run build`; exercise affected flows. For hosting, assets or navigation changes, also run `npm run test:beta`. `npm run test:e2e` covers the full production desktop/mobile explorer.

Keep changes small and explain what changed and how you checked it. Preserve provenance, uncertainty, distinct clocks, null values, accessible list/static views and explicit simulation labels. Do not add credentials, telemetry, billable services, sensitive positions or public feeds without independent access/redistribution review. Report reproducible bugs through the repository's issues without personal data or secrets.
