# Roadmap 1.0 — 12 build-first phases

**Each phase:** working increment, focused tests, commit + authorized push, next-chat kickoff. Never require a real feed to build the interface.

0. **Working prototype:** initialize React/TS/Vite/Tailwind, map with graceful tile fallback, simulated worldwide events, categories, timeline, feed, details, mobile layout, run scripts, focused tests. **Must run locally.**
1. **Explorer polish:** refined UX, map interactions, search, clustering as needed, keyboard accessibility, mobile and list view.
2. **First real feed:** integrate a lawful documented earthquake feed (USGS only if exact use permitted; otherwise alternative), visible source/freshness, demo fallback. Do not block on a provider.
3. **Refresh and persistence:** minimal API/cache/backend only as needed; bounded ingestion and resilient error states.
4. **Environment:** add viable fire/weather layers with correct sensor semantics and source permissions.
5. **Global reports:** geopolitical and major-event reporting, attributed claims, multilingual metadata, correction handling, no false verification.
6. **Digital world:** internet outages and censorship measurement layers with coverage caveats.
7. **History:** timeline playback, regional/country exploration, evidence-backed event relationships.
8. **Additional layers:** space, aviation, maritime where free/legal feasible; defer restricted feeds.
9. **Public readiness:** security, accessibility, performance, privacy, legal source audit, free-tier budgets.
10. **Web beta — complete:** owner-authorized GitHub Pages simulation beta deployed and verified; public feeds fail closed, hosting limits disclosed, Apache-2.0 and contribution documentation published.
11. **iOS:** native SwiftUI client on shared data contracts with map, list, filters, details.

AI is deferred. No project-wide freeze when one data provider is unavailable. Real feed approval applies to the feed, not to all development.

**Cost invariant across every phase:** $0 spending, no paid subscriptions/APIs/domains, no billing-enabled infrastructure, no automatic upgrades; free public core access. If quotas or rights prevent a live feed, continue with lawful alternatives or clearly labeled demo data. Public beta must be assessed against actual free-tier limits before deployment.
