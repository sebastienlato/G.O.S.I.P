# Roadmap 3.0 — DRAFT for planning (not yet adopted)

Status: proposal from the owner and Claude, 2026-10-10. `ROADMAP.md` (2.0) stays authoritative until the planning chat (`prompts/ROADMAP_3_PLANNING_KICKOFF.md`) reviews this draft and the owner approves the result. Source names below are **candidates, not approvals**: each still needs the ≤10-line rights/quota/attribution review in DATA_POLICY before use.

## Goal

Give people global intelligence from live, real, public data: open the globe, see what is happening on Earth now, understand what is unusual, and follow any place or topic. Free, no account, honest provenance.

## Where Phase 20 leaves us

Working: globe console, eight real layers, same-origin snapshots, health/staleness, 7-day history for two sources, $0 hosting.

Short of the goal:
1. **Thin default view.** At the default 24 hours only earthquakes, hazards and thermal show records; reports, maritime, space and digital read 0 because of their delays.
2. **Narrow layers.** Warnings cover Germany only, maritime is three regions, space is three launches, news is eight headlines, aviation is missing.
3. **No "so what".** Nothing says what is unusual today or what is happening in one country.
4. **"Live" is best-effort.** GitHub's schedule ran twice in seven hours on 2026-10-09.
5. **Data is view-only.** No charts, trends, export, feeds or way to follow something.

## Standing rules (unchanged from AGENTS unless the owner changes them)

$0 by default; static site + scheduled ingestion; same-origin data; 25 MB site cap; safety rules (no tactical tracking, no precise vulnerable-person positions, aggregate/delay sensitive movement); reports are attributed claims; no inferred causes, casualties or corroboration; no simulations in the public product.

## New rules proposed for 3.0

- **Default-view rule.** Every feature phase must change what a first-time visitor sees without touching a control. A new toggle alone is not a delivery.
- **Data quality bar (below).** A layer ships only when it meets it.
- **Two roles.** Work (GPT) owns sources, ingestion, features and tests. Claude owns visual design and interaction quality. Claude runs a design pass after every two or three feature phases, not one at the end; work leaves new UI functional and plain rather than styling it heavily.
- **Layer domains.** Past about ten layers the flat list stops working. Group layers as Earth, Sky & Space, Sea & Air, Digital, People, Reports. Claude designs the grouped panel when Arc 1 starts.

## Data quality bar

Every published layer must give the user:
1. **Useful by default:** records visible in the default window, or a per-layer default window that fits its delay (for example reports default to 3 days) instead of reading 0.
2. **Global or honestly scoped:** worldwide coverage, or the gap named in the layer row ("Europe + US").
3. **A headline number and a trend:** count now versus the previous period, shown as a small sparkline once history exists.
4. **Ranked, not dumped:** the most significant records first (severity, magnitude, alert level, size), with aggregates last.
5. **Plain-language meaning:** one sentence per record type on what it is and is not ("tests, not outages").
6. **Place context:** country and region on every record that supplies them, so the country view and search work.
7. **Three timestamps where supplied:** occurred, published/updated, retrieved. Unknowns say unknown.
8. **A link to the original** and the licence.
9. **Freshness target:** stated per source (for example "updates every 15 min, delayed 0 h") and shown against actual.
10. **Downloadable:** the same JSON the page reads is documented and linkable.

## Phases

### Arc 1 — Make "live" true and the layers full (21–28)

| # | Phase | Delivery | Candidate sources | Owner input |
|---|---|---|---|---|
| 21 | Reliable cadence + useful defaults | External free trigger for the existing workflow; "next update expected" in the masthead; per-layer default windows so no layer reads 0 by default; ranked feed | Free cron trigger calling `workflow_dispatch` | One free account + token as an Actions secret |
| 22 | Global alerts | Worldwide disaster alerts with levels; cyclone tracks/forecast cones on the globe; US and Europe weather warnings replace Germany-only | GDACS, NWS alerts, MeteoAlarm, NHC/JTWC via GDACS | None expected |
| 23 | Space weather + orbits | Aurora oval on the globe, Kp, flares; ISS and a few notable satellites as labelled predictions | NOAA SWPC, CelesTrak | None expected |
| 24 | Maritime chokepoints | Daily transit counts for Suez, Panama, Hormuz, Malacca, Bab el-Mandeb and more ports, with 7/30-day trend | IMF PortWatch | None |
| 25 | Internet outages | Country-level outage signals as a choropleth plus feed; keeps OONI as context | IODA, Cloudflare Radar | Free Radar token |
| 26 | News at scale | Hundreds of attributed headlines a day, placed by supplied country only, grouped by country and topic | ReliefWeb, UN News, other clearly licensed feeds | Approved ReliefWeb appname |
| 27 | Aviation | Delayed, aggregated traffic density as a smooth field; airport disruption status | ADSB.lol (ODbL), FAA NAS status, OpenSky if agreement obtained | Possibly one provider contact |
| 28 | People + health | Outbreak notices, displacement figures, air quality | WHO DON, UNHCR, OpenAQ | Possibly a free key |

### Arc 2 — Turn layers into intelligence (29–33)

| # | Phase | Delivery |
|---|---|---|
| 29 | Country view | Click or search a country: every layer's records for it, headline numbers, trends, sources, shareable link. Choropleth mode on the globe. |
| 30 | History for every source | Downsampled daily aggregates for all layers within the size cap; time scrubber and time-lapse on the globe; per-layer charts. |
| 31 | Baselines + anomalies | "Unusual now" panel: activity versus 7/30-day norm per region and layer. Deterministic statistics; no AI, no causes. |
| 32 | Daily brief | "Last 24 hours" page built from the largest events and anomalies, each line linked to its source; shareable; becomes the default landing panel. |
| 33 | Conflict + security (owner decision) | Only delayed, region-aggregated data consistent with the safety rules, or explicitly out of scope. Candidates: UCDP. |

### Arc 3 — A platform people rely on (34–38)

| # | Phase | Delivery |
|---|---|---|
| 34 | Follow without an account | RSS/Atom/JSON feeds per layer and country; saved views in the browser; embeddable globe; compare two countries. |
| 35 | Explore + export | Full-text search across layers and history, filters by severity and domain, CSV/JSON export of the current view, documented open data files. |
| 36 | Economy + energy | Energy grid, commodity and food-price signals by country. Candidates: ENTSO-E, EIA, WFP/HDX. Free keys likely. |
| 37 | Trust + reach | Real accessibility audit, Safari/Firefox, UI languages, installable offline app, methodology and source-status pages. |
| 38 | Optional, owner approval each | Labelled AI translation and summaries, paid sources, iOS consuming the shared snapshots. |

## Recommended order

21 first (everything depends on real cadence and non-empty defaults). Then 22 and 29, because global alerts and the country view change the first impression most. Then 23–28 in any order that source reviews allow, with 30–32 following once at least twelve layers exist. Blocked sources never stall a phase: take the next candidate.

## Decisions the owner should make before or during planning

1. **External trigger account** for phase 21 (free; which provider).
2. **Size cap.** History for every source (30) may not fit 25 MB. Options: keep the cap and downsample hard; raise the cap; or host data files on a second free static host.
3. **Conflict data (33):** in scope with delay/aggregation, or out.
4. **Non-commercial licences.** OONI and Radar are NC; confirm GOSIP stays non-commercial long term.
5. **Design-pass cadence:** after every two or three phases, as proposed.

## Claude design passes (planned)

- With 21: grouped layer panel, per-layer trend chips, "next update" masthead element.
- After 22–24: alert-level marks, cyclone tracks, aurora and orbit rendering, chokepoint cards.
- With 29: country view layout and choropleth palette.
- After 30–32: time scrubber, charts, anomaly panel and daily brief as the landing experience.
- With 34–35: embeds, export and feed surfaces; phone layout review at every pass.
