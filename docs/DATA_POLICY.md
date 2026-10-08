# Data policy

For each real feed before public integration, briefly record: official provider, exact allowed use/redistribution, attribution, limits, refresh interval, coverage and sensitivity. If unresolved, use fixtures or another provider; do not stop unrelated development.

Normalized event: id, category, title, summary, coordinates/region optional, source_name/source_url optional, occurred_at/published_at optional, collected_at, status, freshness, is_demo, coverage_note optional. Preserve provider identifiers and corrections. Distinguish sensor observations from verified incidents and media reports from confirmed events. Never imply complete worldwide coverage. Treat third-party content as untrusted. Protect privacy and avoid unnecessary tactical precision for sensitive conflict data.

## Phase 0 assets

- Events: 18 original GOSIP synthetic fixtures; no real incident claims or external source links. Scenario occurrence/publication and fixture snapshot timestamps are distinguished. Broad markers carry no measured precision or confidence.
- Geography: Natural Earth 4.1.0, 1:110m, packaged by world-atlas 2.0.2. [Official terms](https://www.naturalearthdata.com/about/terms-of-use/) reviewed 2026-10-08 permit public-domain use, modification, and electronic dissemination. Bundled files and package notice are in `public/`; no remote service/quota. Historical generalized borders are illustrative.
- Runtime validation rejects unknown categories, unlabeled/non-demo records, invalid coordinates, malformed timestamps/order, duplicate IDs, and missing/oversized strings. React renders event text without raw HTML. A future feed adapter must validate its own broader contract and safe source URLs; the demo parser deliberately accepts only simulations.
