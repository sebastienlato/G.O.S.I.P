# Test-only responses

`usgs-recorded.json` is a two-record subset of the USGS / ANSS M2.5+ week summary fetched during Phase 12 on 2026-10-09 UTC (October 8 owner timezone). Metadata count is adjusted to the subset; parameters and source generation time are retained. Credit: U.S. Geological Survey / ANSS. Source: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson . Rights reviewed in docs/DATA_POLICY.md. Never publish this test snapshot as live data. The companion usgs.ts/weather.ts payloads are invented test responses.

`legacy/` preserves original synthetic fixtures and source documents for unit tests and the frozen native exporter. They are never public assets or a browser playback mode. Production builds reject imports from this directory. Native `links.json` parity predates the live web migration and currently reports drift; this phase does not regenerate native resources.
