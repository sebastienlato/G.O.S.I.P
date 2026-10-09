import type { Category, ExplorerEvent } from './events'
import type { SourceHealth, PublishedSnapshot } from './published'

export const EONET_URL =
  'https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=30&category=volcanoes,severeStorms&limit=201'
export const EONET_MAX_BYTES = 500_000
export const hazardKinds = {
  volcanoes: 'Volcanoes',
  severeStorms: 'Severe storms',
} as const
export interface HazardEvent {
  kind: 'hazard'
  id: string
  provider_id: string
  title: string
  summary: string
  category: Category
  hazard_categories: (keyof typeof hazardKinds)[]
  coordinates: [number, number] | null
  geometry_at: string
  occurred_at: null
  updated_at: null
  closed_at: string | null
  collected_at: string
  region: string
  country: string
  source_name: string
  source_url: string
  references: { id: string; url: string | null }[]
  magnitude: number | null
  magnitude_unit: string | null
  is_demo: false
  status: 'open' | 'closed'
  freshness: 'retrieved'
  coverage_note: string
}
export const isHazard = (event: ExplorerEvent): event is HazardEvent =>
  'kind' in event && event.kind === 'hazard'
export interface HazardSnapshot {
  events: HazardEvent[]
  retrieved_at: string
  generated_at: null
  feed: { title: string; events: unknown[] }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid object')
  return value as Record<string, unknown>
}
function text(value: unknown, max = 200): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value)
  )
    throw Error('Invalid text')
  return value
}
function date(value: unknown, now: number): string {
  const s = text(value, 30)
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString() !==
      s.replace(/Z$/, s.includes('.') ? 'Z' : '.000Z') ||
    Date.parse(s) > now + 300_000
  )
    throw Error('Invalid date')
  return new Date(s).toISOString()
}
function point(value: unknown): [number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !value.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
    Math.abs(value[0]) > 180 ||
    Math.abs(value[1]) > 90
  )
    throw Error('Invalid point')
  return [value[0], value[1]]
}
// References are navigation only. Never fetch or proxy a provider-supplied URL.
function referenceURL(value: unknown): string | null {
  const raw = text(value, 1000)
  const url = new URL(raw)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) ||
    url.hostname.endsWith('.local')
  )
    throw Error('Unsafe reference')
  return url.protocol === 'https:' ? url.href : null
}
export function parseEONET(input: unknown, now: number): HazardSnapshot {
  const feed = object(input)
  if (
    feed.title !== 'EONET Events' ||
    !Array.isArray(feed.events) ||
    feed.events.length > 200
  )
    throw Error('Invalid or truncated EONET envelope')
  const ids = new Set<string>()
  const compact: unknown[] = []
  const events = feed.events.map((raw): HazardEvent => {
    const e = object(raw)
    const id = text(e.id, 60)
    if (!/^EONET_[a-zA-Z0-9_-]+$/.test(id) || ids.has(id))
      throw Error('Invalid/duplicate ID')
    ids.add(id)
    const title = text(e.title)
    if (
      !Array.isArray(e.categories) ||
      !e.categories.length ||
      e.categories.length > 4
    )
      throw Error('Invalid categories')
    const kinds = e.categories.map((c) => {
      const key = text(object(c).id)
      if (!Object.hasOwn(hazardKinds, key)) throw Error('Out-of-scope category')
      return key as keyof typeof hazardKinds
    })
    const closed = e.closed === null ? null : date(e.closed, now)
    if (!Array.isArray(e.sources) || !e.sources.length || e.sources.length > 10)
      throw Error('Invalid references')
    const references = e.sources.map((s) => {
      const r = object(s)
      return { id: text(r.id, 60), url: referenceURL(r.url) }
    })
    if (
      !Array.isArray(e.geometry) ||
      !e.geometry.length ||
      e.geometry.length > 1000
    )
      throw Error('Invalid geometry')
    const geometries = e.geometry
      .map((rawGeometry) => {
        const g = object(rawGeometry)
        const at = date(g.date, now)
        let coordinates: [number, number] | null = null
        if (g.type === 'Point') coordinates = point(g.coordinates)
        else if (g.type === 'Polygon') {
          if (
            !Array.isArray(g.coordinates) ||
            !g.coordinates.length ||
            g.coordinates.length > 20
          )
            throw Error('Invalid polygon')
          for (const ring of g.coordinates) {
            if (!Array.isArray(ring) || ring.length < 4 || ring.length > 1000)
              throw Error('Invalid ring')
            ring.forEach(point)
            if (JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1)))
              throw Error('Unclosed ring')
          }
        } else throw Error('Unsupported geometry')
        const magnitude = g.magnitudeValue ?? null
        if (
          magnitude !== null &&
          (typeof magnitude !== 'number' || !Number.isFinite(magnitude))
        )
          throw Error('Invalid magnitude')
        const unit = g.magnitudeUnit == null ? null : text(g.magnitudeUnit, 60)
        return {
          at,
          coordinates,
          magnitude: magnitude as number | null,
          unit,
          raw: {
            date: at,
            type: g.type,
            coordinates: g.coordinates,
            magnitudeValue: magnitude,
            magnitudeUnit: unit,
          },
        }
      })
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    const latest = geometries[0]
    // Publish only the latest dated geometry; no inferred centroid, track or occurrence.
    compact.push({
      id,
      title,
      closed,
      categories: kinds.map((id) => ({ id })),
      sources: e.sources.map((s) => ({ id: object(s).id, url: object(s).url })),
      geometry: [latest.raw],
    })
    return {
      kind: 'hazard',
      id: `eonet-${id}`,
      provider_id: id,
      title,
      summary: `NASA EONET curated ${kinds.map((k) => hazardKinds[k].toLowerCase()).join(', ')} metadata. ${closed ? 'Listed closed' : 'Listed open'} by EONET.`,
      category: kinds.includes('volcanoes') ? 'physical' : 'environment',
      hazard_categories: kinds,
      coordinates: latest.coordinates,
      geometry_at: latest.at,
      occurred_at: null,
      updated_at: null,
      closed_at: closed,
      collected_at: new Date(now).toISOString(),
      region: '',
      country: '',
      source_name: 'NASA EONET',
      source_url: `https://eonet.gsfc.nasa.gov/api/v3/events/${id}`,
      references,
      magnitude: latest.magnitude,
      magnitude_unit: latest.unit,
      is_demo: false,
      status: closed ? 'closed' : 'open',
      freshness: 'retrieved',
      coverage_note:
        'Curated metadata for general information, not an official warning or verified impact. Geometry dates and locations may be approximate; midnight can represent an unspecified time. Latest geometry date drives the time filter, not occurrence or publication. Open/closed status is approximate. Coverage is incomplete; sources are references, not independent corroboration.',
    }
  })
  return {
    events,
    retrieved_at: new Date(now).toISOString(),
    generated_at: null,
    feed: { title: 'EONET Events', events: compact },
  }
}
export function publishEONET(
  snapshot: HazardSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: snapshot
      ? { retrieved_at: snapshot.retrieved_at, feed: snapshot.feed }
      : null,
  }
}
export function decodeEONET(raw: string, now: number) {
  if (new TextEncoder().encode(raw).byteLength > EONET_MAX_BYTES)
    throw Error('Snapshot too large')
  const value = object(JSON.parse(raw))
  const h = object(value.health) as unknown as SourceHealth
  if (
    value.version !== 1 ||
    h.source !== 'eonet' ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    h.generated_at !== null ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    h.record_count > 200 ||
    (h.status === 'ok'
      ? h.error !== null
      : typeof h.error !== 'string' || h.error.length > 300)
  )
    throw Error('Invalid health')
  const attempted = date(h.attempted_at, now)
  let snapshot: HazardSnapshot | null = null
  if (value.snapshot !== null) {
    const saved = object(value.snapshot)
    const retrieved = date(saved.retrieved_at, now)
    snapshot = parseEONET(saved.feed, Date.parse(retrieved))
    if (
      h.fetched_at !== retrieved ||
      Date.parse(retrieved) > Date.parse(attempted) ||
      h.record_count !== snapshot.events.length ||
      h.status === 'failed'
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
