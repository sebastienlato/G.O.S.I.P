import { ingestSource } from './source'
import { object } from '../src/data/dwd'
import {
  launchTypes,
  parseLaunches,
  publishLaunches,
  decodeLaunches,
  LAUNCH_MAX_BYTES,
  type LaunchRow,
} from '../src/data/launches'
export const LAUNCH_URL =
  'https://ll.thespacedevs.com/2.3.0/launches/upcoming/?limit=20&mode=normal'
const statuses: Record<number, LaunchRow['status']> = {
  1: 'Go for Launch',
  2: 'To Be Determined',
  8: 'To Be Confirmed',
}
function date(v: unknown) {
  if (v === null) return null
  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v) ||
    !Number.isFinite(Date.parse(v))
  )
    throw Error('Invalid time')
  const normalized = new Date(v).toISOString()
  if (normalized.slice(0, 19) !== v.slice(0, 19)) throw Error('Invalid time')
  return normalized
}
export function extractLaunches(input: unknown) {
  const p = object(input)
  if (
    !Number.isSafeInteger(p.count) ||
    (p.count as number) < 0 ||
    !Array.isArray(p.results) ||
    p.results.length !== Math.min(p.count as number, 20)
  )
    throw Error('Invalid catalog')
  const seen = new Set<string>()
  const rows: LaunchRow[] = []
  for (const input of p.results) {
    const r = object(input)
    if (typeof r.id !== 'string' || seen.has(r.id))
      throw Error('Duplicate or invalid ID')
    seen.add(r.id)
    const mission = r.mission === null ? null : object(r.mission)
    const status = object(r.status).id
    if (
      !mission ||
      !launchTypes.includes(mission.type as (typeof launchTypes)[number]) ||
      !Object.hasOwn(statuses, status as number)
    )
      continue
    const precision =
      r.net_precision === null ? null : object(r.net_precision).name
    if (
      precision !== null &&
      !['Second', 'Minute', 'Hour', 'Day'].includes(precision as string)
    )
      continue
    const pad = r.pad === null ? null : object(r.pad)
    const location = pad?.location == null ? null : object(pad.location)
    if (location && object(location.celestial_body).id !== 1) continue
    let coordinates: [number, number] | null = null
    if (location && location.longitude !== null && location.latitude !== null) {
      const x = location.longitude,
        y = location.latitude
      if (
        typeof x !== 'number' ||
        typeof y !== 'number' ||
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        Math.abs(x) > 180 ||
        Math.abs(y) > 90
      )
        throw Error('Invalid location')
      coordinates = [Math.round(x), Math.round(y)]
    }
    rows.push({
      id: r.id,
      name: r.name as string,
      net: precision === null || r.net === null ? null : date(r.net),
      precision: r.net === null ? null : (precision as LaunchRow['precision']),
      updated_at: date(r.last_updated),
      status: statuses[status as number],
      mission_type: mission.type as string,
      site: location ? (location.name as string) : 'Launch site unknown',
      country: pad?.country
        ? (object(pad.country).name as string)
        : 'Country unknown',
      coordinates,
    })
  }
  return { considered: p.results.length, total_upcoming: p.count, rows }
}
export function ingestLaunches(
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  return ingestSource(
    {
      source: 'launches',
      url: LAUNCH_URL,
      maxBytes: 500_000,
      publicationMaxBytes: LAUNCH_MAX_BYTES,
      parse: (p, t) => parseLaunches(extractLaunches(p), t),
      validate: () => {},
      publish: publishLaunches,
      decode: decodeLaunches,
    },
    fetcher,
    now,
  )
}
