# G.O.S.I.P. — Global Open Source Intelligence Platform

A free public-data console on a 3D satellite globe, with independent layers, a searchable feed and source freshness. No account, payment or analytics. Coverage is incomplete; this is not an emergency service. **Phase 21 adds honest publication/source freshness and cadence controls.**

**[Open GOSIP](https://sebastienlato.github.io/G.O.S.I.P/)** · [Lightweight list](https://sebastienlato.github.io/G.O.S.I.P/?view=list) · [Static map](https://sebastienlato.github.io/G.O.S.I.P/?map=static)

## What it shows

- **USGS / ANSS:** M2.5+ earthquakes, with occurrence and provider revision times.
- **NASA EONET:** curated storm/volcano metadata; approximate locations and geometry dates, not official alerts.
- **DWD:** original German warnings and validity intervals; feed only, off by default.
- **NASA FIRMS:** global NOAA-20 NRT detections in 2° cells for the preceding 24 hours. Counts are not confirmed fires or precise positions.
- **Global Voices:** attributed headline/byline/link metadata, delayed at least 24 hours. Claims are not verified incidents; no inferred map positions.
- **OONI:** country/day measurement totals ≥1,000, delayed at least 24 hours. Counts cannot establish outages or censorship; country icons are geographic context.
- **Launch Library 2 / The Space Devs:** selected upcoming launch schedules with supplied time precision and rounded sites. Plans may change; no spacecraft tracking or launch observations.
- **IMF PortWatch:** five selected gateways combined into three coarse regions, delayed ≥72 hours and rounded down to tens. Estimates are not vessel positions, trade volume or evidence of disruption.

**Auto** uses source-specific real-clock windows: quakes/thermal/warnings 24 hours, reports 7 days, digital 3 days, maritime 14 days, hazards and launch schedules 30 days. Warnings and schedules look ahead. Explicit 6/24-hour and 3/7-day choices still apply to every layer; Auto in History means 24 hours before capture. Missing records do not mean no activity. Aviation and other unavailable sources stay coming. There are no public simulations or fixture playback routes; old links open real layers or an explicit coming state. Native iOS is paused.

## Freshness and history

Scheduled ingestion publishes bounded snapshots on a best-effort 15-minute cadence. Browsers read data from this site only; the globe separately loads approved NASA GIBS/optional Cesium ion imagery. List/static entry avoids the globe engine and external imagery. Each source preserves original retrieval, provider and event times. Failure retains last-good data marked stale; Fast sources become stale after 45 minutes; hourly reports after 90 minutes, six-hour OONI checks after 6 h 30 min and twelve-hour maritime checks after 12 h 30 min. Source retrieval becomes overdue at its target; failure is stale immediately. Recent retrieval does not prove recent provider curation. The masthead separately reads the live publication build stamp: overdue after 15 minutes, stale after 45. External scheduling is approved but unconfigured; GitHub scheduling remains best effort.

**History** keeps the first successful daily capture of previously published USGS/EONET snapshots, at most seven captures for seven days. Collection began in Phase 19: initial coverage is partial, with no backfill. Captured versions stay fixed; provider links may contain later corrections. Capture time is separate from source time and is not proof of earlier knowledge. Other sources have no archive. Missing/expired captures stay unavailable; outages can interrupt continuity and delay physical deletion of expired payloads.

## Develop and check

Node 24+ recommended; ingestion and CI use Node 24.

```sh
npm ci
npm run ingest
npm run dev
npm test
npm run build
npm run test:beta
```

Ingestion writes ignored `public/data/`. Missing snapshots show unavailable data. Fixtures live under `tests/fixtures/` for tests and the frozen native prototype; the build rejects fixture imports and public fixture files. `npm run build:pages` checks repository paths and the 25 MB whole-site cap. Tests use mocked same-origin snapshots, never public fixture modes.

The optional URL-restricted Cesium ion browser token comes from the Actions variable `CESIUM_ION_TOKEN` (locally `VITE_CESIUM_ION_TOKEN` in ignored `.env.local`). Ingestion keys stay server secrets; never commit credentials. Keyless NASA GIBS works without ion.

Official pinned Pages Actions deploy on relevant main pushes, manual dispatch and schedule; no data commits, caches or retained run artifacts. Free hosting has finite quotas and may stop; no paid fallback or automatic upgrade. Owner confirmed no payment method; changed billing settings require a $0 stop-usage budget. See [release evidence and limits](docs/BETA_READINESS.md), [data rights](docs/DATA_POLICY.md), [design](docs/DESIGN.md) and [roadmap](ROADMAP.md).

Apache-2.0 covers original software and fixtures. Provider rights remain separate, including Global Voices CC BY 3.0, DWD CC BY 4.0 and adapted OONI CC BY-NC-SA 4.0. Full source caveats/credits are available in the app. [Earlier phases](docs/PHASES_0_11_HISTORY.md) · [Native prototype](docs/IOS.md)
