import type { ExplorerEvent } from './events.ts'
import type { PublishedSnapshot, SourceHealth } from './published.ts'
import { object, iso } from './dwd.ts'
import countryContext from './countryContext.json' with { type: 'json' }
export const OONI_MAX_BYTES = 100_000
export const OONI_DAY_MS = 86_400_000
export const OONI_LICENSE = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
export const OONI_CREDIT = {
  attribution: '© 2020 Open Observatory of Network Interference (OONI)',
  source: 'https://api.ooni.io/',
  license: OONI_LICENSE,
  changes:
    'GOSIP selects delayed country/day web-connectivity totals of at least 1,000 measurements; outcome counters omitted. Adapted data remains CC BY-NC-SA 4.0, separate from Apache-2.0 software. No endorsement.',
} as const
export interface OoniRow {
  country_code: string
  measurement_count: number
}
export interface OoniFeed {
  interval_start: string
  interval_end: string
  test_name: 'web_connectivity'
  reported_countries: number
  rows: OoniRow[]
}
export interface OoniEvent {
  kind: 'ooni-coverage'
  id: string
  title: string
  summary: string
  category: 'digital'
  coordinates: [number, number] | null
  country: string
  country_code: string
  region: string
  interval_start: string
  interval_end: string
  measurement_count: number
  occurred_at: null
  published_at: null
  updated_at: null
  collected_at: string
  source_name: 'OONI'
  source_url: string
  status: 'aggregate measurements'
  is_demo: false
  freshness: 'retrieved'
  coverage_note: string
}
export const isOoni = (e: ExplorerEvent): e is OoniEvent =>
  'kind' in e && e.kind === 'ooni-coverage'
export interface OoniSnapshot {
  retrieved_at: string
  generated_at: null
  events: OoniEvent[]
  feed: OoniFeed
}
export function exactKeys(value: Record<string, unknown>, keys: string[]) {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((k) => !Object.hasOwn(value, k))
  )
    throw Error('Invalid fields')
}
export function ooniWindow(now: number) {
  const end = Math.floor(now / OONI_DAY_MS) * OONI_DAY_MS - OONI_DAY_MS
  return {
    interval_start: new Date(end - OONI_DAY_MS).toISOString(),
    interval_end: new Date(end).toISOString(),
  }
}
const names = new Intl.DisplayNames(['en'], {
  type: 'region',
  fallback: 'none',
})
export function countryName(code: unknown): string {
  if (typeof code !== 'string' || !/^[A-Z]{2}$/.test(code))
    throw Error('Invalid country')
  const name = names.of(code)
  if (!name || ['ZZ', 'EU', 'UN', 'EZ', 'QO', 'XA', 'XB'].includes(code))
    throw Error('Invalid country')
  return name
}
export function count(value: unknown, min = 0): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > 100_000_000
  )
    throw Error('Invalid count')
  return value
}
export function parseOoni(input: unknown, now: number): OoniSnapshot {
  const f = object(input)
  exactKeys(f, [
    'interval_start',
    'interval_end',
    'test_name',
    'reported_countries',
    'rows',
  ])
  const start = iso(f.interval_start, now),
    end = iso(f.interval_end, now - OONI_DAY_MS)
  if (
    Date.parse(end) - Date.parse(start) !== OONI_DAY_MS ||
    Date.parse(start) % OONI_DAY_MS ||
    f.test_name !== 'web_connectivity' ||
    !Array.isArray(f.rows) ||
    f.rows.length > 250
  )
    throw Error('Invalid interval or rows')
  const reported = count(f.reported_countries, 1)
  if (reported > 250 || reported < f.rows.length)
    throw Error('Invalid coverage')
  const seen = new Set<string>()
  const rows = f.rows.map((input) => {
    const r = object(input)
    exactKeys(r, ['country_code', 'measurement_count'])
    countryName(r.country_code)
    const code = r.country_code as string
    if (seen.has(code)) throw Error('Duplicate country')
    seen.add(code)
    return {
      country_code: code,
      measurement_count: count(r.measurement_count, 1000),
    }
  })
  const retrieved_at = new Date(now).toISOString()
  const events = rows.map((r): OoniEvent => {
    const country = countryName(r.country_code)
    const anchor = (
      countryContext as unknown as Record<string, [string, number, number]>
    )[r.country_code]
    return {
      kind: 'ooni-coverage',
      id: `ooni-${start.slice(0, 10)}-${r.country_code}`,
      title: `${country} · web measurements`,
      summary: `${r.measurement_count.toLocaleString('en-US')} OONI web-connectivity measurements in this UTC day. Counts are tests, not people, networks or outages.`,
      category: 'digital',
      coordinates: anchor ? [anchor[1], anchor[2]] : null,
      country,
      country_code: r.country_code,
      region: 'Country / territory context',
      interval_start: start,
      interval_end: end,
      measurement_count: r.measurement_count,
      occurred_at: null,
      published_at: null,
      updated_at: null,
      collected_at: retrieved_at,
      source_name: 'OONI',
      source_url: `https://explorer.ooni.org/country/${r.country_code}`,
      status: 'aggregate measurements',
      is_demo: false,
      freshness: 'retrieved',
      coverage_note:
        'Voluntary, uneven OONI testing; not representative of Internet availability. At least 24 hours delayed; countries below 1,000 measurements omitted. Counts do not establish distinct contributors or anonymity. No outage, censorship, cause or intent inferred. Markers are rounded Natural Earth label anchors, never probe positions or affected areas. Unknown geography stays feed-only.',
    }
  })
  return {
    retrieved_at,
    generated_at: null,
    events,
    feed: {
      interval_start: start,
      interval_end: end,
      test_name: 'web_connectivity',
      reported_countries: reported,
      rows,
    },
  }
}
export function publishOoni(
  s: OoniSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: s
      ? { retrieved_at: s.retrieved_at, credit: OONI_CREDIT, feed: s.feed }
      : null,
  }
}
export function decodeOoni(raw: string, now: number) {
  if (new TextEncoder().encode(raw).length > OONI_MAX_BYTES)
    throw Error('Too large')
  const p = object(JSON.parse(raw)),
    h = object(p.health) as unknown as SourceHealth
  if (
    p.version !== 1 ||
    h.source !== 'ooni' ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    h.generated_at !== null ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    h.record_count > 250 ||
    (h.status === 'ok'
      ? h.error !== null
      : typeof h.error !== 'string' || h.error.length > 300)
  )
    throw Error('Invalid health')
  iso(h.attempted_at, now + 300_000)
  let snapshot: OoniSnapshot | null = null
  if (p.snapshot !== null) {
    const s = object(p.snapshot),
      retrieved = iso(s.retrieved_at, Date.parse(h.attempted_at))
    exactKeys(s, ['retrieved_at', 'credit', 'feed'])
    const credit = object(s.credit)
    exactKeys(credit, Object.keys(OONI_CREDIT))
    if (Object.entries(OONI_CREDIT).some(([k, v]) => credit[k] !== v))
      throw Error('Missing data licence')
    snapshot = parseOoni(s.feed, Date.parse(retrieved))
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
