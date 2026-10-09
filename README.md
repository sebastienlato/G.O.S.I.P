# G.O.S.I.P. — Global Open Source Intelligence Platform

A free public event explorer. **Live USGS earthquakes**, a world map, searchable feed, source details and freshness status. No account, payment, analytics or remote map tiles. Estimates can change; this is not an emergency service.

**[Open GOSIP](https://sebastienlato.github.io/G.O.S.I.P/)** · [Lightweight list](https://sebastienlato.github.io/G.O.S.I.P/?view=list)

## Run

Node 24+ recommended (ingestion and CI use Node 24).

```sh
npm ci
npm run ingest
npm run dev
```

Ingestion writes ignored `public/data/` snapshots. Without a snapshot, the explorer reports unavailable data; it never substitutes invented events. `npm run build:pages` builds for the public repository path.

## Sources

USGS / ANSS M2.5+ past-week earthquakes, fetched by GitHub Actions approximately every 15 minutes. Visitors read same-origin snapshots, never the provider API. Last-good observations survive ingestion failure with a stale label. Real device clock, separate source-generation/retrieval times, 45-minute stale threshold. Schedules and reporting can be delayed; coverage is incomplete.

Other live layers are coming. An explicitly separate **Simulation lab** remains during the transition; its invented examples and fixed clock are never the default. Native iOS work is paused. [Roadmap](ROADMAP.md) · [Data rights and limits](docs/DATA_POLICY.md) · [Deployment and $0 safeguards](docs/BETA_READINESS.md)

## Checks & deployment

- `npm test` — parsers, ingestion, filtering and state tests.
- `npm run build` — typecheck and root production build.
- `npm run test:beta` — desktop/mobile tests at the exact Pages path with same-origin test snapshots.
- GitHub Actions builds and publishes on relevant main pushes, manual dispatch and schedule. No data commits; no branch publishing. `gh-pages` is preserved.
- `npm run release:pages` dispatches the existing deployment workflow.

Public core access is free. Hosting has finite quotas and may stop; no automatic paid upgrade. Owner confirmed no payment method for Actions storage protection. If that changes, establish a $0 Actions stop-usage budget before continuing ingestion.

Apache-2.0 for original software and fixtures; provider/map/dependency rights remain separate. [Earlier development history](docs/PHASES_0_11_HISTORY.md) · [Native prototype](docs/IOS.md)
