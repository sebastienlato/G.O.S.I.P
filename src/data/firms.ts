import type { ExplorerEvent } from './events.ts'
import type { PublishedSnapshot, SourceHealth } from './published.ts'
import { object, iso } from './dwd.ts'
export const FIRMS_MAX_BYTES = 200_000
export const FIRMS_AREA = 'world'
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
  feed: {
    product: typeof FIRMS_PRODUCT
    area: typeof FIRMS_AREA
    interval_start: string
    interval_end: string
    cells: number[][]
  }
}
export function parseFIRMS(input: unknown, now: number): FireSnapshot {
  const f = object(input)
  if (
    f.product !== FIRMS_PRODUCT ||
    f.area !== FIRMS_AREA ||
    !Array.isArray(f.cells) ||
    f.cells.length > 2500
  )
    throw Error('Invalid fire summary')
  const start = iso(f.interval_start, now),
    end = iso(f.interval_end, now)
  if (Date.parse(end) - Date.parse(start) !== 86400_000)
    throw Error('Invalid window')
  const ids = new Set<string>()
  let total = 0
  const events = f.cells.map((cell): FireSummary => {
    if (!Array.isArray(cell) || cell.length !== 3) throw Error('Invalid cell')
    const [lon, lat, count] = cell
    if (
      !Number.isInteger(lon) ||
      !Number.isInteger(lat) ||
      lon < -179 ||
      lon > 179 ||
      lat < -89 ||
      lat > 89 ||
      Math.abs(lon % 2) !== 1 ||
      Math.abs(lat % 2) !== 1 ||
      !Number.isSafeInteger(count) ||
      count < 1 ||
      count > 500000
    )
      throw Error('Invalid grid/count')
    total += count
    if (total > 500000) throw Error('Too many detections')
    const id = `firms-${end}-${lon}-${lat}`
    if (ids.has(id)) throw Error('Duplicate grid')
    ids.add(id)
    return {
      kind: 'fire-summary',
      id,
      title: `${count} thermal ${count === 1 ? 'detection' : 'detections'}`,
      summary:
        'NASA FIRMS NOAA-20 VIIRS detections worldwide, aggregated by GOSIP into a 2° cell over the preceding 24 hours. Not confirmed fires.',
      category: 'environment',
      coordinates: [lon, lat],
      region: `2° cell centred ${lat}°, ${lon}°`,
      country: '',
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
        'Global most-recent NRT window; no additional GOSIP delay. Cell centres are display anchors, not detection positions or fire boundaries. Thermal anomalies can have multiple causes; counts are satellite detections, not distinct fires, impacts or corroboration. One sensor and a rolling 24-hour window; cloud, overpass and processing gaps limit coverage. Generation/publication/update times and individual positions are not published.',
    }
  })
  return {
    events,
    retrieved_at: new Date(now).toISOString(),
    generated_at: null,
    feed: {
      product: FIRMS_PRODUCT,
      area: FIRMS_AREA,
      interval_start: start,
      interval_end: end,
      cells: f.cells,
    },
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
