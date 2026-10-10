import type { SourceHealth } from './published'
export const PIPELINE_TARGET_MS = 15 * 60_000
// Targets bound requests; none promises provider content or the next publication.
export const cadence: Record<
  SourceHealth['source'],
  {
    minutes: number
    provider: string
    delay: string
    scope: string
    url: string
  }
> = {
  usgs: {
    minutes: 15,
    provider: 'Feed updates each minute',
    delay: 'No added delay',
    scope: 'Global M2.5+; uneven coverage',
    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php',
  },
  eonet: {
    minutes: 15,
    provider: 'Curated; update interval unknown',
    delay: 'No added delay',
    scope: 'Selected global storms / volcanoes',
    url: 'https://eonet.gsfc.nasa.gov/what-is-eonet',
  },
  dwd: {
    minutes: 15,
    provider: 'Warning updates; interval unknown',
    delay: 'No added delay',
    scope: 'Germany; feed only',
    url: 'https://www.dwd.de/warnungen',
  },
  firms: {
    minutes: 15,
    provider: 'Satellite passes; NRT latency varies',
    delay: 'No added delay; 2° aggregation',
    scope: 'Global NOAA-20 detections',
    url: 'https://firms.modaps.eosdis.nasa.gov/',
  },
  news: {
    minutes: 60,
    provider: 'Feed advertises hourly updates',
    delay: 'At least 24 h safety delay',
    scope: 'Global Voices English edition',
    url: 'https://globalvoices.org/feeds/',
  },
  ooni: {
    minutes: 360,
    provider: 'Daily measurement bucket; revision cadence unknown',
    delay: 'At least 24 h safety delay',
    scope: 'Reported countries; ≥1,000 tests',
    url: 'https://ooni.org/support/interpreting-ooni-data/',
  },
  launches: {
    minutes: 15,
    provider: 'Schedules edited irregularly',
    delay: 'No added delay',
    scope: 'Selected upcoming launches',
    url: 'https://thespacedevs.com/llapi',
  },
  maritime: {
    minutes: 720,
    provider: 'Daily estimates; publication lag varies',
    delay: 'At least 72 h safety delay',
    scope: 'Five gateways / three regions',
    url: 'https://portwatch.imf.org/pages/data-and-methodology',
  },
}
export const staleAfter = (source: SourceHealth['source']) =>
  Math.max(45, cadence[source].minutes + 30) * 60_000
export const dueSource = (health: SourceHealth, now: number) =>
  now - Date.parse(health.attempted_at) >=
  cadence[health.source].minutes * 60_000
export function ageLabel(time: string | null | undefined, now: number) {
  if (!time || !Number.isFinite(Date.parse(time))) return 'unknown'
  const minutes = Math.max(0, Math.floor((now - Date.parse(time)) / 60_000))
  return minutes < 60
    ? `${minutes} min ago`
    : minutes < 1440
      ? `${Math.floor(minutes / 60)} h ${minutes % 60} min ago`
      : `${Math.floor(minutes / 1440)} d ago`
}
