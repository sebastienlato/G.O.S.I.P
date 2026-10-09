import { isLaunch, launchMatches, type LaunchEvent } from './launches'
import { isOoni, type OoniEvent } from './ooni'
import { isNews, type NewsEvent } from './news'
import { isFireSummary, type FireSummary } from './firms'
import { isWarning, type WarningEvent } from './dwd'
import { isHazard, type HazardEvent } from './eonet'
import {
  isAdditional,
  additionalBases,
  type AdditionalEvent,
} from './additional'
import {
  isDigital,
  digitalFamilies,
  digitalResults,
  type DigitalEvent,
} from './digital'
import { isReport, type ReportEvent } from './reports'
import { isForecast, type ForecastEvent } from './weather'
import type { ThermalEvent } from './fire'
export const categories = {
  environment: { label: 'Environment', color: '#addc8d' },
  physical: { label: 'Earth & activity', color: '#f3b67c' },
  digital: { label: 'Digital world', color: '#b5a5f5' },
  science: { label: 'Science & space', color: '#7dcee1' },
  civic: { label: 'Global affairs', color: '#ef9daa' },
} as const
export type Category = keyof typeof categories
export type WindowHours = 6 | 24 | 72 | 168
export const DEMO_NOW = '2026-10-08T16:00:00.000Z'
export const DEMO_TIME = Date.parse(DEMO_NOW)

export interface DemoEvent {
  id: string
  title: string
  summary: string
  category: Category
  region: string
  country: string
  coordinates: [number, number]
  occurred_at: string
  published_at: string
  collected_at: string
  source_name: string
  status: 'simulated'
  is_demo: true
  freshness: 'fixed-demo'
  coverage_note: string
}

export interface EarthquakeEvent extends Omit<
  DemoEvent,
  'published_at' | 'status' | 'is_demo' | 'freshness'
> {
  is_demo: false
  status: string | null
  freshness: 'retrieved'
  provider_id: string
  source_url: string
  network: string | null
  provider_code: string | null
  updated_at: string | null
  feed_generated_at: string
  magnitude: number | null
  magnitude_type: string | null
  depth_km: number | null
}
export type ExplorerEvent =
  | LaunchEvent
  | OoniEvent
  | NewsEvent
  | FireSummary
  | WarningEvent
  | HazardEvent
  | DemoEvent
  | EarthquakeEvent
  | ForecastEvent
  | ThermalEvent
  | ReportEvent
  | DigitalEvent
  | AdditionalEvent
export const eventBadge = (event: ExplorerEvent) =>
  isLaunch(event)
    ? 'SCHEDULED LAUNCH · LL2'
    : isOoni(event)
      ? 'AGGREGATE MEASUREMENTS · OONI'
      : isNews(event)
        ? 'ATTRIBUTED REPORT · GLOBAL VOICES'
        : isFireSummary(event)
          ? 'THERMAL DETECTIONS · FIRMS'
          : isWarning(event)
            ? 'WEATHER WARNING · DWD'
            : isHazard(event)
              ? 'CURATED HAZARD · EONET'
              : isAdditional(event)
                ? `SIMULATED · ${event.family.toUpperCase()}`
                : isDigital(event)
                  ? 'SIMULATED · DIGITAL MEASUREMENT'
                  : isReport(event)
                    ? 'SIMULATED · ATTRIBUTED CLAIM'
                    : event.is_demo
                      ? 'SIMULATED'
                      : isForecast(event)
                        ? 'FORECAST · NWS'
                        : event.status === 'deleted'
                          ? 'WITHDRAWN · USGS'
                          : 'OBSERVATION · USGS'
export const markerLabel = (event: ExplorerEvent) =>
  `${isLaunch(event) ? 'Scheduled launch · site context' : isOoni(event) ? 'OONI aggregate measurements' : isNews(event) ? 'Attributed report' : isFireSummary(event) ? 'FIRMS thermal detections' : isWarning(event) ? 'DWD weather warning' : isHazard(event) ? 'EONET curated hazard' : isAdditional(event) ? `Simulated ${event.family} example` : isDigital(event) ? 'Simulated digital measurement' : isReport(event) ? 'Simulated report' : event.is_demo ? 'Simulated' : isForecast(event) ? 'NWS forecast' : 'USGS observation'}: ${event.title}${event.country || event.region ? `, ${event.country || event.region}` : ''}`

type Seed = [Category, string, string, string, number, number, number, string]
const seeds: Seed[] = [
  [
    'physical',
    'Seismic activity scenario',
    'North Pacific',
    'Japan',
    142,
    38,
    0.5,
    'An invented offshore seismic observation used to explore how a sensor event could appear. No earthquake is being reported.',
  ],
  [
    'environment',
    'Forest canopy monitoring',
    'Amazon basin',
    'Brazil',
    -61,
    -6,
    1.5,
    'A fictional change in a regional vegetation index. This sample demonstrates environmental observations without claiming forest loss or an active fire.',
  ],
  [
    'digital',
    'Network resilience exercise',
    'Western Europe',
    'Netherlands',
    5,
    52,
    2.3,
    'An invented connectivity exercise across a broad region. No actual disruption, affected provider, or outage is implied.',
  ],
  [
    'science',
    'Ocean research expedition',
    'South Atlantic',
    'South Africa',
    14,
    -36,
    3.5,
    'A fictional marine research campaign samples ocean conditions. The broad marker is illustrative and does not track a vessel.',
  ],
  [
    'environment',
    'Coastal weather scenario',
    'Southeast Asia',
    'Philippines',
    123,
    13,
    4.2,
    'An invented weather observation for demonstrating map exploration. This is not a forecast, warning, or emergency advisory.',
  ],
  [
    'civic',
    'Regional climate forum',
    'East Africa',
    'Kenya',
    37,
    0,
    5.5,
    'A fictional public forum about regional climate adaptation. No real meeting, organization, participant, or agreement is represented.',
  ],
  [
    'science',
    'Aurora observation scenario',
    'Northern Europe',
    'Norway',
    20,
    68,
    7,
    'An invented observation of auroral activity, included to demonstrate a science event. This is not a current sky forecast.',
  ],
  [
    'physical',
    'Volcano monitoring exercise',
    'North Atlantic',
    'Iceland',
    -19,
    65,
    8.5,
    'A fictional monitoring exercise. No eruption, evacuation, or change to a real volcano alert level is being reported.',
  ],
  [
    'digital',
    'Connectivity mapping study',
    'South Asia',
    'India',
    78,
    22,
    10,
    'An invented regional connectivity study. Coverage values are not measured and no network or individual is tracked.',
  ],
  [
    'environment',
    'Reef observation scenario',
    'Coral Sea',
    'Australia',
    150,
    -20,
    13,
    'An invented marine observation illustrating a regional ecosystem story. It does not identify an actual bleaching event or sensitive habitat location.',
  ],
  [
    'civic',
    'Public transport workshop',
    'North America',
    'Canada',
    -76,
    46,
    17,
    'A fictional regional workshop exploring public transport. The event and its participants are entirely invented.',
  ],
  [
    'science',
    'Desert observatory exercise',
    'South America',
    'Chile',
    -70,
    -25,
    22,
    'A fictional astronomy observation used to test science event presentation. No actual facility or discovery is identified.',
  ],
  [
    'environment',
    'Watershed survey scenario',
    'North America',
    'United States',
    -120,
    40,
    30,
    'An invented watershed survey for exploring environmental coverage. This does not report water quality or a public health concern.',
  ],
  [
    'digital',
    'Island connectivity exercise',
    'Oceania',
    'New Zealand',
    174,
    -41,
    42,
    'A fictional regional connectivity exercise. No actual undersea infrastructure or service outage is depicted.',
  ],
  [
    'civic',
    'Community science exchange',
    'West Africa',
    'Ghana',
    -2,
    7,
    60,
    'An invented regional exchange about community science. No actual people, organization, or policy decision is represented.',
  ],
  [
    'physical',
    'Ocean buoy test scenario',
    'North Pacific',
    'United States',
    -155,
    22,
    80,
    'An invented buoy observation used to demonstrate physical activity data. It is not a tsunami alert or a real instrument position.',
  ],
  [
    'environment',
    'Mountain snow survey',
    'Central Asia',
    'Kyrgyzstan',
    75,
    42,
    108,
    'An invented broad-region snow survey. No current snowpack measurement or flood forecast is supplied.',
  ],
  [
    'science',
    'Polar research scenario',
    'Antarctic region',
    'Antarctica',
    20,
    -69,
    144,
    'A fictional polar research update. The position is a broad illustrative region, not the location of a research team.',
  ],
]

export function parseDemoEvents(input: unknown): DemoEvent[] {
  if (!Array.isArray(input)) throw new Error('Expected an event array')
  const ids = new Set<string>()
  return input.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid event')
    const e = item as Record<string, unknown>
    for (const key of [
      'id',
      'title',
      'summary',
      'region',
      'country',
      'source_name',
      'coverage_note',
    ]) {
      if (typeof e[key] !== 'string' || !e[key].trim() || e[key].length > 2000)
        throw new Error(`Invalid ${key}`)
    }
    if (
      typeof e.category !== 'string' ||
      !Object.hasOwn(categories, e.category)
    )
      throw new Error('Invalid category')
    if (
      e.is_demo !== true ||
      e.status !== 'simulated' ||
      e.freshness !== 'fixed-demo'
    )
      throw new Error('Demo provider accepts only labeled simulations')
    if (
      !Array.isArray(e.coordinates) ||
      e.coordinates.length !== 2 ||
      !e.coordinates.every(
        (n) => typeof n === 'number' && Number.isFinite(n),
      ) ||
      Math.abs(e.coordinates[0]) > 180 ||
      Math.abs(e.coordinates[1]) > 90
    )
      throw new Error('Invalid coordinates')
    for (const key of ['occurred_at', 'published_at', 'collected_at']) {
      if (
        typeof e[key] !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(e[key]) ||
        !Number.isFinite(Date.parse(e[key])) ||
        new Date(e[key]).toISOString() !== e[key]
      )
        throw new Error(`Invalid ${key}`)
    }
    if (
      Date.parse(e.occurred_at as string) >
        Date.parse(e.published_at as string) ||
      Date.parse(e.published_at as string) >
        Date.parse(e.collected_at as string)
    )
      throw new Error('Invalid timestamp order')
    if (ids.has(e.id as string)) throw new Error('Duplicate event id')
    ids.add(e.id as string)
    return e as unknown as DemoEvent
  })
}

export const demoEvents = parseDemoEvents(
  seeds.map(
    ([category, title, region, country, lon, lat, hours, summary], index) => ({
      id: `demo-${String(index + 1).padStart(3, '0')}`,
      category,
      title,
      region,
      country,
      summary,
      coordinates: [lon, lat],
      occurred_at: new Date(DEMO_TIME - hours * 3_600_000).toISOString(),
      published_at: new Date(
        DEMO_TIME - hours * 3_600_000 + 300_000,
      ).toISOString(),
      collected_at: DEMO_NOW,
      source_name: 'GOSIP synthetic fixture collection',
      status: 'simulated',
      is_demo: true,
      freshness: 'fixed-demo',
      coverage_note:
        'Invented example with an approximate regional marker. This small sample is not representative of global activity. Absence of a marker does not mean absence of events.',
    }),
  ),
)

export interface EventProvider {
  getEvents(): readonly DemoEvent[]
}
export const demoProvider: EventProvider = { getEvents: () => demoEvents }

export function filterEvents(
  events: readonly ExplorerEvent[],
  query: string,
  selected: readonly Category[],
  hours: WindowHours,
  referenceTime = DEMO_TIME,
): ExplorerEvent[] {
  const q = query.trim().toLocaleLowerCase()
  const cutoff = referenceTime - hours * 3_600_000
  return events
    .filter(
      (e) =>
        selected.includes(e.category) &&
        (isLaunch(e)
          ? launchMatches(e, referenceTime, hours)
          : isFireSummary(e) || isOoni(e)
            ? Date.parse(e.interval_end) > cutoff &&
              Date.parse(e.interval_start) < referenceTime
            : isWarning(e)
              ? (e.valid_until === null ||
                  Date.parse(e.valid_until) > referenceTime) &&
                Date.parse(e.valid_from) < referenceTime + hours * 3_600_000
              : isForecast(e)
                ? Date.parse(e.valid_until) > referenceTime &&
                  Date.parse(e.occurred_at) < referenceTime + hours * 3_600_000
                : isDigital(e)
                  ? Date.parse(e.interval_end) > cutoff &&
                    Date.parse(e.occurred_at) < referenceTime
                  : Date.parse(eventTime(e)) >= cutoff &&
                    Date.parse(eventTime(e)) <= referenceTime) &&
        `${e.title} ${e.source_name} ${isNews(e) ? e.author : ''} ${e.summary} ${e.region} ${e.country} ${categories[e.category].label} ${isAdditional(e) ? `${e.family} ${additionalBases[e.basis]} ${e.unit}` : ''} ${isDigital(e) ? `${e.source_name} ${e.method} ${digitalFamilies[e.family]} ${digitalResults[e.result]} ${e.network_asn === null ? '' : `AS${e.network_asn}`}` : ''} ${isReport(e) ? `${e.source_name} ${e.source_language} ${e.translation?.title ?? ''} ${e.translation?.summary ?? ''}` : ''}`
          .toLocaleLowerCase()
          .includes(q),
    )
    .sort((a, b) =>
      isLaunch(a) !== isLaunch(b)
        ? isLaunch(a)
          ? -1
          : 1
        : isLaunch(a) && isLaunch(b)
          ? Date.parse(a.net ?? '9999-01-01') -
            Date.parse(b.net ?? '9999-01-01')
          : isForecast(a) && isForecast(b)
            ? Date.parse(a.occurred_at) - Date.parse(b.occurred_at)
            : Date.parse(eventTime(b)) - Date.parse(eventTime(a)),
    )
}
// Reports and additional summaries use publication; digital uses interval end.
export const eventTime = (event: ExplorerEvent): string =>
  isLaunch(event)
    ? (event.net ?? event.collected_at)
    : isOoni(event)
      ? event.interval_end
      : isNews(event)
        ? event.published_at
        : isFireSummary(event)
          ? event.interval_end
          : isWarning(event)
            ? event.valid_from
            : isHazard(event)
              ? event.geometry_at
              : isAdditional(event)
                ? event.published_at
                : isDigital(event)
                  ? event.interval_end
                  : isReport(event)
                    ? event.published_at
                    : event.occurred_at
export type MappedEvent = ExplorerEvent & { coordinates: [number, number] }
export const hasCoordinates = (event: ExplorerEvent): event is MappedEvent =>
  event.coordinates !== null

export function demoAge(iso: string, referenceTime = DEMO_TIME): string {
  const minutes = Math.max(
    0,
    Math.round((referenceTime - Date.parse(iso)) / 60_000),
  )
  return minutes < 60
    ? `${minutes}m`
    : minutes < 1440
      ? `${Math.floor(minutes / 60)}h`
      : `${Math.floor(minutes / 1440)}d`
}
export function formatTimestamp(iso: string | number): string {
  return (
    new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(new Date(iso)) + ' UTC'
  )
}

export const locationMeaning = (event: ExplorerEvent) =>
  isLaunch(event)
    ? event.coordinates
      ? 'Rounded launch-site context · not a spacecraft position'
      : 'Feed only · site unknown'
    : isOoni(event)
      ? event.coordinates
        ? 'Country context · not a probe position or affected area'
        : 'Feed only · no country anchor available'
      : isNews(event)
        ? 'Feed only · no location inferred'
        : isFireSummary(event)
          ? '2° cell centre · 24h summary, not a detection position'
          : isWarning(event)
            ? 'District warning · feed only, no coordinates supplied'
            : isHazard(event)
              ? event.coordinates
                ? 'Approximate latest geometry · not hazard extent'
                : 'Polygon retained in source · feed only'
              : isAdditional(event)
                ? event.location_precision === 'region'
                  ? 'Broad illustrative context · not a vehicle or orbital position'
                  : event.location_precision === 'withheld'
                    ? 'Location withheld for safety · not mapped'
                    : 'Location not supplied · not mapped'
                : isDigital(event)
                  ? event.location_precision === 'region'
                    ? 'Broad illustrative region · not a probe or outage extent'
                    : event.location_precision === 'withheld'
                      ? 'Location withheld for safety · not mapped'
                      : 'Location not supplied · not mapped'
                  : isReport(event)
                    ? event.location_precision === 'region'
                      ? 'Broad illustrative region · not an incident position'
                      : event.location_precision === 'withheld'
                        ? 'Location withheld for safety · not mapped'
                        : 'Location not supplied · not mapped'
                    : event.is_demo
                      ? 'Approximate location'
                      : isForecast(event)
                        ? 'Forecast location'
                        : 'Estimated epicentre'
