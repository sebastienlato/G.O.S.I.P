# Roadmap 2.0 — real public data

Web first; iOS paused. Every phase delivers a working increment on the public site, focused checks, commit/push and the next kickoff. $0 default; owner-created free keys/accounts allowed. Never add billing or paid service without explicit approval. Review each source's current rights and limits; blocked sources do not stall other work. Fixtures become test-only; during transition the separate simulation lab is never the default. End state: no simulated public layers.

12. **Live foundation — complete and deployed:** scheduled bounded USGS ingestion, health/last-good retention, official Pages Actions deployment, real clock and earthquakes by default.
13. **Global hazards + multiple live layers — complete and deployed:** independent USGS/EONET toggles, combined map/feed, validated shared filters and per-source freshness. EONET storms/volcanoes use bounded server snapshots; replaced simulations retired from web. Flood polygons deferred after size/coordinate validation failures. See PROJECT_STATE for actual deployment verification.
14. **Fire & weather — complete and deployed:** owner-key FIRMS delayed 2° daily detection counts and DWD German warnings, independent live layers; replaced fire simulation hidden when FIRMS is available. Optional forecasts deferred after separate terms review. See PROJECT_STATE for deployment evidence.
15. **World news & reports — deployed; scheduler recovery remains open (PROJECT_STATE):** attributed original-language headline/metadata + link-out; review GDELT, ReliefWeb approved appname and broadcaster/agency terms. Deterministic grouping, no verification claims. Retire simulated reports.
15b. **Globe console — built by Claude, owner-approved (D52/D53):** CesiumJS 3D satellite globe (Esri/ion satellite, NASA today, night lights, labels, optional ion terrain + Google 3D cities), intelligence-console design, live UTC/feed status, target reticle and camera flights; all live layers on the globe; 25 MB cap. See docs/DESIGN.md.
16. **Digital world:** review IODA, Cloudflare Radar free token and OONI aggregated CC BY-NC-SA obligations. No raw sensitive measurements. Retire simulated digital.
17. **Space:** review Launch Library 2, NOAA SWPC and CelesTrak; retain prediction/observation distinctions. On the globe: launch sites, and satellite positions/orbits only where terms allow and with prediction labelled as such. Retire simulated space.
18. **Aviation & maritime:** safety-aggregated/delayed counts or density on the globe (heat cells or delayed aggregates), no precise sensitive tracks. Review OpenSky, adsb.lol and AIS providers such as aisstream.io. Hide unsupported live layers; record optional paid alternatives. Retire simulated movement.
19. **Real history:** bounded 7–30 day rolling archive within verified free limits. Replace fixture playback with actual published snapshots.
20. **Public launch:** zero simulated public sources; fixtures test-only. Final Claude visual polish pass before launch. Source status, accessibility/performance/security checks, traffic/size budgets and fail-closed fallbacks; concise README.
21. **Optional, owner approval each:** paid sources, clearly labeled AI translation/summarization/grouping, iOS consuming shared snapshots.

Candidate lists are starting points, not approvals. No tactical conflict tracking, precise vulnerable-person positions, inferred causes/casualties or implied corroboration. Account-free public access and honest provenance remain mandatory.

Phases 0–11 and native view links are complete historical work. The optional native map pan/zoom kickoff is superseded. See docs/PHASES_0_11_HISTORY.md.
