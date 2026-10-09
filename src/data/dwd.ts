import type { ExplorerEvent } from './events.ts'
import type { PublishedSnapshot, SourceHealth } from './published.ts'
export const DWD_URL =
  'https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json'
export const DWD_MAX_BYTES = 600_000
export interface WarningEvent {
  kind: 'warning'
  id: string
  title: string
  summary: string
  instruction: string
  category: 'environment'
  coordinates: null
  region: string
  country: 'Germany'
  valid_from: string
  valid_until: string | null
  occurred_at: null
  published_at: null
  updated_at: null
  collected_at: string
  feed_generated_at: string
  source_name: string
  source_url: string
  district: string
  level: number
  altitude_start: number | null
  altitude_end: number | null
  status: 'warning'
  is_demo: false
  freshness: 'retrieved'
  coverage_note: string
}
export const isWarning = (e: ExplorerEvent): e is WarningEvent =>
  'kind' in e && e.kind === 'warning'
export interface WarningSnapshot {
  events: WarningEvent[]
  retrieved_at: string
  generated_at: string
  feed: { time: number; warnings: Record<string, unknown[]>; copyright: string }
}
export function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('Invalid object')
  return v as Record<string, unknown>
}
export function text(v: unknown, max = 250): string {
  if (
    typeof v !== 'string' ||
    !v.trim() ||
    v.length > max ||
    /[<>\u0000-\u0008\u000b-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(
      v,
    )
  )
    throw Error('Invalid text')
  return v
}
export function iso(v: unknown, upper: number): string {
  if (
    typeof v !== 'string' ||
    !Number.isFinite(Date.parse(v)) ||
    new Date(v).toISOString() !== v ||
    Date.parse(v) > upper
  )
    throw Error('Invalid date')
  return v
}
function epoch(v: unknown, upper: number): string {
  if (
    !Number.isSafeInteger(v) ||
    (v as number) < 946684800000 ||
    (v as number) > upper
  )
    throw Error('Invalid epoch')
  return new Date(v as number).toISOString()
}
export function parseDWD(input: unknown, now: number): WarningSnapshot {
  const f = object(input)
  const generated = epoch(f.time, now + 300_000)
  if (f.copyright !== 'Copyright Deutscher Wetterdienst')
    throw Error('Missing attribution')
  const warnings = object(f.warnings)
  if (Object.keys(warnings).length > 600) throw Error('Too many districts')
  const events: WarningEvent[] = []
  const compact: Record<string, unknown[]> = {}
  const ids = new Set<string>()
  for (const [district, records] of Object.entries(warnings)) {
    if (
      !/^\d{9}$/.test(district) ||
      !Array.isArray(records) ||
      records.length > 20
    )
      throw Error('Invalid district')
    compact[district] = records.map((raw) => {
      const r = object(raw)
      const start = epoch(r.start, now + 8 * 86400_000),
        end = r.end === null ? null : epoch(r.end, now + 15 * 86400_000)
      if (end !== null && start >= end) throw Error('Invalid validity')
      const title = text(r.headline),
        summary = text(r.description, 6000),
        region = text(r.regionName)
      const instruction = r.instruction === '' ? '' : text(r.instruction, 6000)
      if (
        !Number.isInteger(r.level) ||
        Number(r.level) < 1 ||
        Number(r.level) > 5 ||
        !Number.isInteger(r.type) ||
        Number(r.type) < 0 ||
        Number(r.type) > 20
      )
        throw Error('Invalid classification')
      const altitude = (v: unknown) => {
        if (v === null) return null
        if (
          typeof v !== 'number' ||
          !Number.isFinite(v) ||
          v < -500 ||
          v > 10000
        )
          throw Error('Invalid altitude')
        return v
      }
      const low = altitude(r.altitudeStart),
        high = altitude(r.altitudeEnd)
      const id = `dwd-${district}-${r.type}-${r.start}-${r.end}-${r.level}-${low}-${high}`
      if (ids.has(id) || events.length >= 1500)
        throw Error('Duplicate or too many warnings')
      ids.add(id)
      events.push({
        kind: 'warning',
        id,
        title,
        summary,
        instruction,
        category: 'environment',
        coordinates: null,
        region,
        country: 'Germany',
        valid_from: start,
        valid_until: end,
        occurred_at: null,
        published_at: null,
        updated_at: null,
        collected_at: new Date(now).toISOString(),
        feed_generated_at: generated,
        source_name: 'Deutscher Wetterdienst (DWD)',
        source_url: 'https://www.dwd.de/warnungen',
        district,
        level: Number(r.level),
        altitude_start: low,
        altitude_end: high,
        status: 'warning',
        is_demo: false,
        freshness: 'retrieved',
        coverage_note:
          'DWD district weather warnings, original German text. Validity is a prediction interval, not observed occurrence. Feed-only: this product supplies no coordinates. Preliminary information is excluded. Check current DWD guidance; GOSIP is not an emergency service.',
      })
      return {
        headline: title,
        description: summary,
        instruction,
        regionName: region,
        start: r.start,
        end: r.end,
        level: r.level,
        type: r.type,
        altitudeStart: low,
        altitudeEnd: high,
      }
    })
  }
  return {
    events,
    retrieved_at: new Date(now).toISOString(),
    generated_at: generated,
    feed: { time: Number(f.time), warnings: compact, copyright: f.copyright },
  }
}
// Accept only the documented wrapper; never execute JSONP as JavaScript.
export function decodeDWDResponse(raw: string): unknown {
  const match = /^warnWetter\.loadWarnings\((\{[\s\S]*\})\);\s*$/.exec(raw)
  if (!match) throw Error('Invalid wrapper')
  return JSON.parse(match[1])
}
export function publishDWD(
  s: WarningSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: s ? { retrieved_at: s.retrieved_at, feed: s.feed } : null,
  }
}
export function decodeDWD(raw: string, now: number) {
  if (new TextEncoder().encode(raw).length > DWD_MAX_BYTES)
    throw Error('Too large')
  const p = object(JSON.parse(raw)),
    h = object(p.health) as unknown as SourceHealth
  if (
    p.version !== 1 ||
    h.source !== 'dwd' ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    h.record_count > 1500 ||
    (h.status === 'ok'
      ? h.error !== null
      : typeof h.error !== 'string' || h.error.length > 300)
  )
    throw Error('Invalid health')
  iso(h.attempted_at, now + 300_000)
  let snapshot: WarningSnapshot | null = null
  if (p.snapshot !== null) {
    const s = object(p.snapshot)
    const retrieved = iso(s.retrieved_at, Date.parse(h.attempted_at))
    snapshot = parseDWD(s.feed, Date.parse(retrieved))
    if (
      h.status === 'failed' ||
      h.fetched_at !== retrieved ||
      h.generated_at !== snapshot.generated_at ||
      h.record_count !== snapshot.events.length
    )
      throw Error('Inconsistent health')
  } else if (
    h.status !== 'failed' ||
    h.record_count !== 0 ||
    h.fetched_at !== null ||
    h.generated_at !== null
  )
    throw Error('Missing snapshot')
  return { snapshot, health: h }
}
