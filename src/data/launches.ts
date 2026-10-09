import type { ExplorerEvent } from './events.ts'
import type { PublishedSnapshot, SourceHealth } from './published.ts'
import { object, iso } from './dwd.ts'
import { exactKeys } from './ooni.ts'
export const LAUNCH_MAX_BYTES = 100_000
export const LAUNCH_CREDIT =
  'Launch Library 2 · The Space Devs. Selected metadata and rounded site context by GOSIP; no endorsement.'
export const launchTypes = [
  'Communications',
  'Earth Science',
  'Planetary Science',
  'Astrophysics',
  'Heliophysics',
  'Lunar Exploration',
  'Robotic Exploration',
  'Technology',
  'Test Flight',
] as const
export interface LaunchRow {
  id: string
  name: string
  net: string | null
  precision: 'Second' | 'Minute' | 'Hour' | 'Day' | null
  updated_at: string | null
  status: 'Go for Launch' | 'To Be Determined' | 'To Be Confirmed'
  mission_type: string
  site: string
  country: string
  coordinates: [number, number] | null
}
export interface LaunchFeed {
  considered: number
  total_upcoming: number
  rows: LaunchRow[]
}
export interface LaunchEvent extends LaunchRow {
  kind: 'launch-schedule'
  category: 'science'
  title: string
  summary: string
  region: string
  occurred_at: null
  published_at: null
  collected_at: string
  source_name: 'Launch Library 2 / The Space Devs'
  source_url: string
  is_demo: false
  freshness: 'retrieved'
  coverage_note: string
}
export const isLaunch = (e: ExplorerEvent): e is LaunchEvent =>
  'kind' in e && e.kind === 'launch-schedule'
export interface LaunchSnapshot {
  retrieved_at: string
  generated_at: null
  events: LaunchEvent[]
  feed: LaunchFeed
}
export function launchText(v: unknown, max = 200): string {
  if (
    typeof v !== 'string' ||
    !v.trim() ||
    v.length > max ||
    /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>]/u.test(v)
  )
    throw Error('Invalid text')
  return v.trim()
}
export function launchInterval(
  row: Pick<LaunchRow, 'net' | 'precision'>,
): [number, number] | null {
  if (!row.net || !row.precision) return null
  const size = {
    Second: 1000,
    Minute: 60_000,
    Hour: 3_600_000,
    Day: 86_400_000,
  }[row.precision]
  const start = Math.floor(Date.parse(row.net) / size) * size
  return [start, start + size]
}
export function launchMatches(row: LaunchRow, now: number, hours: number) {
  const interval = launchInterval(row)
  return (
    !interval || (interval[1] > now && interval[0] < now + hours * 3_600_000)
  )
}
export function launchTimeLabel(row: LaunchRow) {
  if (!row.net || !row.precision) return 'Schedule time unknown · source listed'
  const length = { Second: 19, Minute: 16, Hour: 13, Day: 10 }[row.precision]
  return `Scheduled ${row.net.slice(0, length).replace('T', ' ')} UTC · ${row.precision.toLowerCase()} precision`
}
export function parseLaunches(input: unknown, now: number): LaunchSnapshot {
  const f = object(input)
  exactKeys(f, ['considered', 'total_upcoming', 'rows'])
  if (
    !Number.isSafeInteger(f.considered) ||
    (f.considered as number) < 0 ||
    (f.considered as number) > 20 ||
    !Number.isSafeInteger(f.total_upcoming) ||
    (f.total_upcoming as number) < (f.considered as number) ||
    (f.total_upcoming as number) > 100_000 ||
    !Array.isArray(f.rows) ||
    f.rows.length > (f.considered as number)
  )
    throw Error('Invalid coverage')
  const seen = new Set<string>()
  const rows: LaunchRow[] = f.rows.map((input) => {
    const r = object(input)
    exactKeys(r, [
      'id',
      'name',
      'net',
      'precision',
      'updated_at',
      'status',
      'mission_type',
      'site',
      'country',
      'coordinates',
    ])
    if (
      typeof r.id !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        r.id,
      ) ||
      seen.has(r.id)
    )
      throw Error('Invalid ID')
    seen.add(r.id)
    if (
      ![null, 'Second', 'Minute', 'Hour', 'Day'].includes(
        r.precision as string,
      ) ||
      !['Go for Launch', 'To Be Determined', 'To Be Confirmed'].includes(
        r.status as string,
      ) ||
      !launchTypes.includes(r.mission_type as (typeof launchTypes)[number])
    )
      throw Error('Invalid schedule')
    if ((r.net === null) !== (r.precision === null))
      throw Error('Invalid unknown schedule')
    const net = r.net === null ? null : iso(r.net, now + 10 * 366 * 86_400_000)
    const updated =
      r.updated_at === null ? null : iso(r.updated_at, now + 300_000)
    const c = r.coordinates
    if (
      c !== null &&
      (!Array.isArray(c) ||
        c.length !== 2 ||
        !c.every(Number.isInteger) ||
        Math.abs(c[0]) > 180 ||
        Math.abs(c[1]) > 90)
    )
      throw Error('Invalid site')
    return {
      id: r.id,
      name: launchText(r.name),
      net,
      precision: r.precision as LaunchRow['precision'],
      updated_at: updated,
      status: r.status as LaunchRow['status'],
      mission_type: r.mission_type as string,
      site: launchText(r.site),
      country: launchText(r.country),
      coordinates: c as LaunchRow['coordinates'],
    }
  })
  const retrieved_at = new Date(now).toISOString()
  return {
    retrieved_at,
    generated_at: null,
    feed: {
      considered: f.considered as number,
      total_upcoming: f.total_upcoming as number,
      rows,
    },
    events: rows.map((r) => ({
      ...r,
      id: `ll2-${r.id}`,
      kind: 'launch-schedule',
      category: 'science',
      title: r.name,
      summary: `${r.status} · ${r.mission_type}. ${launchTimeLabel(r)}. Plans can change; no launch observation is asserted.`,
      region: r.site,
      occurred_at: null,
      published_at: null,
      collected_at: retrieved_at,
      source_name: 'Launch Library 2 / The Space Devs',
      source_url: `https://ll.thespacedevs.com/2.3.0/launches/${r.id}/`,
      is_demo: false,
      freshness: 'retrieved',
      coverage_note:
        'Selected public schedules from the first 20 upcoming LL2 entries. Only listed science, communications and technology/test mission types; unknown, military, crew and resupply categories omitted. Dates coarser than a day omitted. Unknown schedule times remain source-listed in every window. Rounded 1° launch-site context only, never spacecraft, person or network positions. No telemetry, orbits, launch outcomes or impact inference.',
    })),
  }
}
export function publishLaunches(
  s: LaunchSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: s
      ? { retrieved_at: s.retrieved_at, credit: LAUNCH_CREDIT, feed: s.feed }
      : null,
  }
}
export function decodeLaunches(raw: string, now: number) {
  if (new TextEncoder().encode(raw).length > LAUNCH_MAX_BYTES)
    throw Error('Too large')
  const p = object(JSON.parse(raw)),
    h = object(p.health) as unknown as SourceHealth
  if (
    p.version !== 1 ||
    h.source !== 'launches' ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    h.generated_at !== null ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    h.record_count > 20 ||
    (h.status === 'ok'
      ? h.error !== null
      : typeof h.error !== 'string' || !h.error || h.error.length > 300)
  )
    throw Error('Invalid health')
  iso(h.attempted_at, now + 300_000)
  let snapshot: LaunchSnapshot | null = null
  if (p.snapshot !== null) {
    const s = object(p.snapshot)
    exactKeys(s, ['retrieved_at', 'credit', 'feed'])
    const retrieved = iso(s.retrieved_at, Date.parse(h.attempted_at))
    if (s.credit !== LAUNCH_CREDIT) throw Error('Missing credit')
    snapshot = parseLaunches(s.feed, Date.parse(retrieved))
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
