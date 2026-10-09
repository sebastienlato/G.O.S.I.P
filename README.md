# G.O.S.I.P. — Global Open Source Intelligence Platform

A free open-source intelligence console. **Live earthquakes, hazards, German warnings, global thermal detections, attributed report headlines delayed digital measurement totals public launch schedules and delayed maritime estimates** on a 3D satellite globe you can fly from orbit to street level, with a searchable feed, source details and freshness status. No account, payment or analytics. The globe loads imagery from NASA GIBS and (optionally) Cesium ion; data comes only from GOSIP's own snapshots. Estimates can change; this is not an emergency service.

**[Open GOSIP](https://sebastienlato.github.io/G.O.S.I.P/)** · [Lightweight list](https://sebastienlato.github.io/G.O.S.I.P/?view=list)

## Run

Node 24+ recommended (ingestion and CI use Node 24).

```sh
npm ci
npm run ingest
npm run dev
```

Optional: put a URL-restricted Cesium ion token in `.env.local` as `VITE_CESIUM_ION_TOKEN=…` for terrain, Bing imagery and 3D cities (the public build reads the `CESIUM_ION_TOKEN` Actions variable). Ingestion writes ignored `public/data/` snapshots. Without a snapshot, the explorer reports unavailable data; it never substitutes invented events. `npm run build:pages` builds for the public repository path.

## Sources

Independent **USGS / ANSS earthquakes** and **NASA EONET storms/volcanoes** toggles share the map/feed. DWD German weather warnings, available FIRMS thermal summaries and Global Voices report headlines join them; DWD is off by default; the other connected layers are on. USGS observations use occurrence time; EONET curated metadata uses the latest geometry date, with approximate locations/times and no official-alert or corroboration claim. EONET requests the past 30 days; visible windows remain 6 hours–7 days. It may contain no recent volcano entries. Unknown values stay unknown.

GitHub Actions publishes bounded snapshots. A real scheduled deployment was verified on October 9 at 17:09 UTC with fresh mirrored health and completed artifact cleanup. Scheduling remains best effort; see [release evidence](docs/BETA_READINESS.md). Visitors read same-origin JSON. Each layer shows its own retrieval, count and failure/stale state; retained data keeps original times. Stale after 45 minutes or failure. USGS supplies feed generation; EONET does not, so recent retrieval cannot prove recent curation.

DWD warnings retain original German text and validity intervals; they are feed-only because the source supplies no coordinates. FIRMS NOAA-20 VIIRS uses the latest global NRT data, streamed into 2° counts for the preceding 24 hours, without an added delay or precise detection positions. Counts are detections, not confirmed fires. Global Voices English-edition headlines retain bylines, publication times and original links; claims are not verified incidents. Reports are feed-only and delayed at least 24 hours: select 3 or 7 days to see them. OONI adds country/day web-connectivity test totals, delayed at least 24 hours; select 3 or 7 days. Blue network icons are geographic country context, never probe positions. Voluntary uneven coverage and low-volume exclusions mean these counts cannot establish outages or censorship. Adapted OONI data is CC BY-NC-SA 4.0, separate from Apache software. Space adds selected Launch Library 2 / The Space Devs schedules: choose 7 days for upcoming launches, with rounded site context and supplied time precision. Plans may change; these are not launch observations or spacecraft positions. NOAA space weather and orbital predictions remain deferred. Maritime adds IMF PortWatch estimates for five selected gateways: at least 72 hours delayed, combined into three 10° regions and rounded down to tens. Cyan glow represents selected gateway counts, not vessel locations or routes; choose 7 days and read the supplied source day. Aviation and other live layers are coming. An explicitly separate **Simulation lab** remains; replaced seismic, coastal-weather, volcano, fire, digital, space and maritime examples are hidden from web. Native iOS is paused. [Roadmap](ROADMAP.md) · [Data rights and limits](docs/DATA_POLICY.md) · [Deployment and $0 safeguards](docs/BETA_READINESS.md)

## Real history

Choose **History** to explore daily captures of published USGS earthquakes and NASA EONET hazards on the same globe/feed. Retention is seven days, with at most one capture per UTC day; collection begins in Phase 19, so missing days are explicit. Capture time is separate from source occurrence, geometry, revision and retrieval. Captured versions stay fixed; provider links may show later revisions. This is partial sampled history, not a complete archive or proof of what was known earlier. Other layers remain in **Current** view. No simulation fallback; outages can interrupt retention.

## Checks & deployment

- `npm test` — parsers, ingestion, filtering and state tests.
- `npm run build` — typecheck and root production build.
- `npm run test:beta` — desktop/mobile tests at the exact Pages path with same-origin test snapshots.
- GitHub Actions builds and publishes on relevant main pushes, manual dispatch and schedule. No data commits; no branch publishing. `gh-pages` is preserved.
- `npm run release:pages` dispatches the existing deployment workflow.

Public core access is free. Hosting has finite quotas and may stop; no automatic paid upgrade. Owner confirmed no payment method for Actions storage protection. If that changes, establish a $0 Actions stop-usage budget before continuing ingestion.

Apache-2.0 for original software and fixtures; provider/map/dependency rights remain separate. [Earlier development history](docs/PHASES_0_11_HISTORY.md) · [Native prototype](docs/IOS.md)
