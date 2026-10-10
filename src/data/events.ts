import { isMaritime, type MaritimeEvent } from './maritime'
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
export type WindowChoice = WindowHours | 'auto'

// Fixed real-clock windows reflect each published product, never its last-good age.
export function defaultWindowHours(event: ExplorerEvent): number {
  if (isMaritime(event)) return 14 * 24
  if (isLaunch(event) || isHazard(event)) return 30 * 24
  if (isNews(event)) return 7 * 24
  if (isOoni(event)) return 72
  return 24
}
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
  | MaritimeEvent
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
  isMaritime(event)
    ? 'ESTIMATED PORT CALLS · PORTWATCH'
    : isLaunch(event)
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
  `${isMaritime(event) ? 'Estimated regional port calls' : isLaunch(event) ? 'Scheduled launch · site context' : isOoni(event) ? 'OONI aggregate measurements' : isNews(event) ? 'Attributed report' : isFireSummary(event) ? 'FIRMS thermal detections' : isWarning(event) ? 'DWD weather warning' : isHazard(event) ? 'EONET curated hazard' : isAdditional(event) ? `Simulated ${event.family} example` : isDigital(event) ? 'Simulated digital measurement' : isReport(event) ? 'Simulated report' : event.is_demo ? 'Simulated' : isForecast(event) ? 'NWS forecast' : 'USGS observation'}: ${event.title}${event.country || event.region ? `, ${event.country || event.region}` : ''}`

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

export function filterEvents(
  events: readonly ExplorerEvent[],
  query: string,
  selected: readonly Category[],
  hours: WindowChoice,
  referenceTime = DEMO_TIME,
): ExplorerEvent[] {
  const q = query.trim().toLocaleLowerCase()
  return events
    .filter((e) => {
      const windowHours = hours === 'auto' ? defaultWindowHours(e) : hours
      const cutoff = referenceTime - windowHours * 3_600_000
      return (
        selected.includes(e.category) &&
        (isLaunch(e)
          ? launchMatches(e, referenceTime, windowHours)
          : isFireSummary(e) || isOoni(e) || isMaritime(e)
            ? Date.parse(e.interval_end) > cutoff &&
              Date.parse(e.interval_start) < referenceTime
            : isWarning(e)
              ? (e.valid_until === null ||
                  Date.parse(e.valid_until) > referenceTime) &&
                Date.parse(e.valid_from) <
                  referenceTime + windowHours * 3_600_000
              : isForecast(e)
                ? Date.parse(e.valid_until) > referenceTime &&
                  Date.parse(e.occurred_at) <
                    referenceTime + windowHours * 3_600_000
                : isDigital(e)
                  ? Date.parse(e.interval_end) > cutoff &&
                    Date.parse(e.occurred_at) < referenceTime
                  : Date.parse(eventTime(e)) >= cutoff &&
                    Date.parse(eventTime(e)) <= referenceTime) &&
        `${e.title} ${e.source_name} ${isNews(e) ? e.author : ''} ${e.summary} ${e.region} ${e.country} ${categories[e.category].label} ${isAdditional(e) ? `${e.family} ${additionalBases[e.basis]} ${e.unit}` : ''} ${isDigital(e) ? `${e.source_name} ${e.method} ${digitalFamilies[e.family]} ${digitalResults[e.result]} ${e.network_asn === null ? '' : `AS${e.network_asn}`}` : ''} ${isReport(e) ? `${e.source_name} ${e.source_language} ${e.translation?.title ?? ''} ${e.translation?.summary ?? ''}` : ''}`
          .toLocaleLowerCase()
          .includes(q)
      )
    })
    .sort((a, b) =>
      // Aggregated thermal cells share one window end and would bury every
      // individual record: list them last, busiest cell first.
      isFireSummary(a) !== isFireSummary(b)
        ? isFireSummary(a)
          ? 1
          : -1
        : isFireSummary(a) && isFireSummary(b)
          ? b.detection_count - a.detection_count
          : isLaunch(a) !== isLaunch(b)
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
  isMaritime(event)
    ? event.interval_end
    : isLaunch(event)
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
  isMaritime(event)
    ? '10° gateway region · delayed estimates, not vessel locations'
    : isLaunch(event)
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
