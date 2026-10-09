import type { ExplorerEvent } from './events'
import type { PublishedSnapshot, SourceHealth } from './published'
import { object, iso } from './dwd'
export const FIRMS_MAX_BYTES = 200_000
export const FIRMS_PRODUCT = 'VIIRS_NOAA20_NRT'
export interface FireSummary {
  kind: 'fire-summary'
  id: string
  title: string
  summary: string
  category: 'environment'
  coordinates: [number, number]
  region: string
  country: ''
  day: string
  interval_start: string
  interval_end: string
  occurred_at: null
  published_at: null
  updated_at: null
  collected_at: string
  source_name: string
  source_url: string
  detection_count: number
  status: 'detections'
  is_demo: false
  freshness: 'retrieved'
  coverage_note: string
}
export const isFireSummary = (e: ExplorerEvent): e is FireSummary =>
  'kind' in e && e.kind === 'fire-summary'
export interface FireSnapshot {
  events: FireSummary[]
  retrieved_at: string
  generated_at: null
  feed: { product: typeof FIRMS_PRODUCT; day: string; cells: number[][] }
}
export function parseFIRMS(input: unknown, now: number): FireSnapshot {
  const f = object(input)
  if (
    f.product !== FIRMS_PRODUCT ||
    typeof f.day !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(f.day) ||
    !Array.isArray(f.cells) ||
    f.cells.length > 2500
  )
    throw Error('Invalid fire summary')
  const start = iso(`${f.day}T00:00:00.000Z`, now),
    end = new Date(Date.parse(start) + 86400_000).toISOString()
  if (Date.parse(end) > now - 86400_000) throw Error('Insufficient delay')
  const ids = new Set<string>()
  let total = 0
  const events = f.cells.map((cell): FireSummary => {
    if (!Array.isArray(cell) || cell.length !== 3) throw Error('Invalid cell')
    const [lon, lat, count] = cell
    if (
      !Number.isInteger(lon) ||
      !Number.isInteger(lat) ||
      Math.abs(lon) > 179 ||
      Math.abs(lat) > 89 ||
      Math.abs(lon % 2) !== 1 ||
      Math.abs(lat % 2) !== 1 ||
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > 60000
    )
      throw Error('Invalid grid/count')
    total += count
    if (total > 60000) throw Error('Too many detections')
    const id = `firms-${f.day}-${lon}-${lat}`
    if (ids.has(id)) throw Error('Duplicate grid')
    ids.add(id)
    return {
      kind: 'fire-summary',
      id,
      title: `${count} thermal detections`,
      summary:
        'NASA FIRMS NOAA-20 VIIRS detections aggregated by GOSIP into a 2° cell and UTC day. Not confirmed fires.',
      category: 'environment',
      coordinates: [lon, lat],
      region: `2° cell centred ${lat}°, ${lon}°`,
      country: '',
      day: f.day as string,
      interval_start: start,
      interval_end: end,
      occurred_at: null,
      published_at: null,
      updated_at: null,
      collected_at: new Date(now).toISOString(),
      source_name: 'NASA FIRMS / LANCE · NOAA-20 VIIRS',
      source_url: 'https://firms.modaps.eosdis.nasa.gov/',
      detection_count: count,
      status: 'detections',
      is_demo: false,
      freshness: 'retrieved',
      coverage_note:
        'At least 24 hours delayed. Cell centres are display anchors, not detection positions or fire boundaries. Thermal anomalies can have multiple causes; counts are satellite detections, not distinct fires, impacts or corroboration. One sensor and one UTC day; cloud, overpass and processing gaps limit coverage. Generation/publication/update times and individual positions are not published.',
    }
  })
  return {
    events,
    retrieved_at: new Date(now).toISOString(),
    generated_at: null,
    feed: { product: FIRMS_PRODUCT, day: f.day, cells: f.cells },
  }
}
export function publishFIRMS(
  s: FireSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: s ? { retrieved_at: s.retrieved_at, feed: s.feed } : null,
  }
}
export function decodeFIRMS(raw: string, now: number) {
  if (new TextEncoder().encode(raw).length > FIRMS_MAX_BYTES)
    throw Error('Too large')
  const p = object(JSON.parse(raw)),
    h = object(p.health) as unknown as SourceHealth
  if (
    p.version !== 1 ||
    h.source !== 'firms' ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    h.generated_at !== null ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    h.record_count > 2500 ||
    (h.status === 'ok'
      ? h.error !== null
      : typeof h.error !== 'string' || h.error.length > 300)
  )
    throw Error('Invalid health')
  iso(h.attempted_at, now + 300_000)
  let snapshot: FireSnapshot | null = null
  if (p.snapshot !== null) {
    const s = object(p.snapshot)
    const retrieved = iso(s.retrieved_at, Date.parse(h.attempted_at))
    snapshot = parseFIRMS(s.feed, Date.parse(retrieved))
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
