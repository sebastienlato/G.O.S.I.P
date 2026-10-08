import { isAdditionalSource } from './additional'
import { DEMO_TIME, type ExplorerEvent } from './events'
import { isDigital } from './digital'
import { isReport } from './reports'

export const HOUR = 3_600_000
export const HISTORY_START = DEMO_TIME - 168 * HOUR
export const supportsPlayback = (source: string) =>
  isAdditionalSource(source) ||
  ['demo', 'fire-demo', 'reports-demo', 'digital-demo'].includes(source)

export function parseCursor(value: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value))
    return null
  const time = Date.parse(value)
  return Number.isFinite(time) &&
    time >= HISTORY_START &&
    time <= DEMO_TIME &&
    new Date(time).toISOString() === value
    ? time
    : null
}

export function parsePlace(value: string | null): string {
  return value &&
    value.length <= 300 &&
    !/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value)
    ? value.trim()
    : ''
}
export function matchesPlace(
  event: ExplorerEvent,
  country: string,
  region: string,
) {
  return (
    (!country ||
      (country === '~unknown' ? !event.country : event.country === country)) &&
    (!region || event.region === region)
  )
}
export function placeOptions(
  events: readonly ExplorerEvent[],
  field: 'country' | 'region',
) {
  return [
    ...new Set(events.map((event) => event[field]).filter(Boolean)),
  ].sort()
}

// An authored teaching comparison, never an inferred real-world association.
export interface FixtureRelationship {
  id: string
  from: string
  to: string
  kind: 'teaching-comparison'
  evidence: string
  author: 'GOSIP fixture authors'
}
export function parseRelationships(
  input: unknown,
  events: readonly ExplorerEvent[],
): FixtureRelationship[] {
  if (!Array.isArray(input) || input.length > 50)
    throw new Error('Invalid relationship envelope')
  const ids = new Set<string>()
  const pairs = new Set<string>()
  return input.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error('Invalid relationship')
    const r = item as Record<string, unknown>
    if (Object.keys(r).sort().join(',') !== 'author,evidence,from,id,kind,to')
      throw new Error('Unknown relationship fields')
    for (const field of ['id', 'from', 'to']) {
      if (typeof r[field] !== 'string' || !/^[a-z0-9-]{1,80}$/.test(r[field]))
        throw new Error('Invalid relationship ID')
    }
    const from = events.find((e) => e.id === r.from)
    const to = events.find((e) => e.id === r.to)
    if (
      !from ||
      !to ||
      from === to ||
      !isDigital(from) ||
      !isDigital(to) ||
      !from.is_demo ||
      !to.is_demo ||
      from.family !== to.family ||
      from.method !== to.method ||
      from.result === to.result
    )
      throw new Error('Invalid comparison references')
    const pair = [from.id, to.id].sort().join('|')
    if (ids.has(r.id as string) || pairs.has(pair))
      throw new Error('Duplicate relationship')
    if (
      r.kind !== 'teaching-comparison' ||
      r.author !== 'GOSIP fixture authors' ||
      typeof r.evidence !== 'string' ||
      r.evidence.length < 10 ||
      r.evidence.length > 600 ||
      /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(r.evidence)
    )
      throw new Error('Invalid relationship evidence')
    ids.add(r.id as string)
    pairs.add(pair)
    return r as unknown as FixtureRelationship
  })
}

export function correctionRelationship(event: ExplorerEvent) {
  if (!isReport(event) || !event.correction) return null
  return {
    from: `${event.id}@${event.correction.previous_updated_at}`,
    to: `${event.id}@${event.updated_at}`,
    evidence: event.correction.note,
    source: event.source_name,
    url: event.source_url,
  }
}
