import type { ExplorerEvent } from './events.ts'
import type { PublishedSnapshot, SourceHealth } from './published.ts'
import { object, iso } from './dwd.ts'
import { exactKeys } from './ooni.ts'
export const MARITIME_MAX_BYTES = 30_000
export const MARITIME_DAY = 86_400_000
export const MARITIME_CREDIT =
  'Sources: UN Global Platform; IMF PortWatch (https://portwatch.imf.org). GOSIP selects five gateways, sums into 10° regions, suppresses totals below 20 and rounds down to tens. No endorsement.'
export const MARITIME_TERMS = 'https://www.imf.org/en/About/copyright-and-terms'
export const maritimeRegions = {
  'north-sea': {
    name: 'North Sea gateways',
    coordinates: [5, 55] as [number, number],
    ports: ['port1114', 'port57'],
  },
  'east-asia': {
    name: 'East Asia gateways',
    coordinates: [125, 35] as [number, number],
    ports: ['port1188', 'port1065'],
  },
  singapore: {
    name: 'Singapore gateway region',
    coordinates: [105, 5] as [number, number],
    ports: ['port1201'],
  },
} as const
export type MaritimeRegion = keyof typeof maritimeRegions
export interface MaritimeFeed {
  interval_start: string
  interval_end: string
  covered_ports: 5
  rows: { region: MaritimeRegion; count: number }[]
}
export interface MaritimeEvent {
  kind: 'maritime-summary'
  id: string
  title: string
  summary: string
  category: 'physical'
  coordinates: [number, number]
  country: string
  region: string
  interval_start: string
  interval_end: string
  count: number
  occurred_at: null
  published_at: null
  updated_at: null
  collected_at: string
  source_name: 'IMF PortWatch'
  source_url: string
  status: 'estimated port calls'
  is_demo: false
  freshness: 'retrieved'
  coverage_note: string
}
export const isMaritime = (e: ExplorerEvent): e is MaritimeEvent =>
  'kind' in e && e.kind === 'maritime-summary'
export const MARITIME_COVERAGE =
  'AIS-derived port-call estimates for Rotterdam, Antwerp, Shanghai, Busan and Singapore only. Not global traffic, unique vessels, cargo volume or disruption evidence. At least 72 hours after the UTC day ends; provider updates may lag. Smooth glow shows selected gateway totals in 10° regions, not routes, vessel locations or uniform density. Counts rounded down to tens; regions below 20 omitted. No individual identifiers or movements.'
export interface MaritimeSnapshot {
  retrieved_at: string
  generated_at: null
  events: MaritimeEvent[]
  feed: MaritimeFeed
}
export function parseMaritime(input: unknown, now: number): MaritimeSnapshot {
  const f = object(input)
  exactKeys(f, ['interval_start', 'interval_end', 'covered_ports', 'rows'])
  const start = iso(f.interval_start, now),
    end = iso(f.interval_end, now)
  if (
    Date.parse(end) - Date.parse(start) !== MARITIME_DAY ||
    Date.parse(start) % MARITIME_DAY ||
    now - Date.parse(end) < 3 * MARITIME_DAY ||
    f.covered_ports !== 5 ||
    !Array.isArray(f.rows) ||
    f.rows.length > 3
  )
    throw Error('Invalid maritime interval or coverage')
  const seen = new Set<string>()
  const rows = f.rows.map((v) => {
    const r = object(v)
    exactKeys(r, ['region', 'count'])
    if (
      typeof r.region !== 'string' ||
      !Object.hasOwn(maritimeRegions, r.region) ||
      seen.has(r.region) ||
      !Number.isSafeInteger(r.count) ||
      (r.count as number) < 20 ||
      (r.count as number) > 100_000 ||
      (r.count as number) % 10
    )
      throw Error('Invalid maritime aggregate')
    seen.add(r.region)
    return { region: r.region as MaritimeRegion, count: r.count as number }
  })
  const retrieved_at = new Date(now).toISOString()
  return {
    retrieved_at,
    generated_at: null,
    feed: { interval_start: start, interval_end: end, covered_ports: 5, rows },
    events: rows.map((r) => ({
      kind: 'maritime-summary',
      id: `maritime-${start.slice(0, 10)}-${r.region}`,
      title: maritimeRegions[r.region].name,
      summary: `${r.count}–${r.count + 9} estimated port calls · ${start.slice(0, 10)} UTC. Selected gateways only; delayed regional aggregate.`,
      category: 'physical',
      coordinates: [...maritimeRegions[r.region].coordinates],
      country: '',
      region: maritimeRegions[r.region].name,
      interval_start: start,
      interval_end: end,
      count: r.count,
      occurred_at: null,
      published_at: null,
      updated_at: null,
      collected_at: retrieved_at,
      source_name: 'IMF PortWatch',
      source_url: 'https://portwatch.imf.org',
      status: 'estimated port calls',
      is_demo: false,
      freshness: 'retrieved',
      coverage_note: MARITIME_COVERAGE,
    })),
  }
}
export function publishMaritime(
  s: MaritimeSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: s
      ? {
          retrieved_at: s.retrieved_at,
          credit: MARITIME_CREDIT,
          terms: MARITIME_TERMS,
          feed: s.feed,
        }
      : null,
  }
}
export function decodeMaritime(raw: string, now: number) {
  if (new TextEncoder().encode(raw).length > MARITIME_MAX_BYTES)
    throw Error('Too large')
  const p = object(JSON.parse(raw)),
    h = object(p.health) as unknown as SourceHealth
  exactKeys(p, ['version', 'health', 'snapshot'])
  if (
    p.version !== 1 ||
    h.source !== 'maritime' ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    h.generated_at !== null ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    h.record_count > 3 ||
    (h.status === 'ok'
      ? h.error !== null
      : typeof h.error !== 'string' || !h.error || h.error.length > 300)
  )
    throw Error('Invalid health')
  iso(h.attempted_at, now + 300_000)
  let snapshot: MaritimeSnapshot | null = null
  if (p.snapshot !== null) {
    const s = object(p.snapshot)
    exactKeys(s, ['retrieved_at', 'credit', 'terms', 'feed'])
    const retrieved = iso(s.retrieved_at, Date.parse(h.attempted_at))
    if (s.credit !== MARITIME_CREDIT || s.terms !== MARITIME_TERMS)
      throw Error('Missing credit')
    snapshot = parseMaritime(s.feed, Date.parse(retrieved))
    if (
      h.status === 'failed' ||
      h.fetched_at !== retrieved ||
      h.record_count !== snapshot.events.length
    )
      throw Error('Inconsistent health')
  } else if (
    h.status !== 'failed' ||
    h.record_count !== 0 ||
    h.fetched_at !== null
  )
    throw Error('Missing snapshot')
  return { snapshot, health: h }
}
