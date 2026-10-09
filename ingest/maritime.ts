import { ingestSource } from './source'
import { object } from '../src/data/dwd'
import {
  parseMaritime,
  publishMaritime,
  decodeMaritime,
  maritimeRegions,
  MARITIME_DAY,
  MARITIME_MAX_BYTES,
} from '../src/data/maritime'
const ports = Object.values(maritimeRegions).flatMap((r) => [...r.ports])
export function maritimeURL(now: number) {
  const today = Math.floor(now / MARITIME_DAY) * MARITIME_DAY
  const day = (days: number) =>
    new Date(today - days * MARITIME_DAY).toISOString().slice(0, 10)
  const u = new URL(
    'https://services9.arcgis.com/weJ1QsnbMYJlCHdG/ArcGIS/rest/services/Daily_Ports_Data/FeatureServer/0/query',
  )
  u.search = new URLSearchParams({
    f: 'json',
    where: `date >= DATE '${day(14)}' AND date <= DATE '${day(4)}' AND portid IN (${ports.map((p) => `'${p}'`).join(',')})`,
    outFields: 'date,portid,portcalls',
    returnGeometry: 'false',
    resultRecordCount: '71',
    orderByFields: 'date DESC,portid ASC',
  }).toString()
  return u.toString()
}
export function extractMaritime(input: unknown, now: number) {
  const p = object(input)
  if (
    p.error ||
    p.exceededTransferLimit === true ||
    !Array.isArray(p.features) ||
    !p.features.length ||
    p.features.length > 70
  )
    throw Error('Invalid maritime response')
  const rows = p.features.map((v) => object(object(v).attributes))
  const seen = new Set<string>()
  const today = Math.floor(now / MARITIME_DAY) * MARITIME_DAY
  for (const r of rows) {
    if (
      typeof r.date !== 'string' ||
      !/^\d{4}-\d\d-\d\d$/.test(r.date) ||
      new Date(r.date).toISOString().slice(0, 10) !== r.date ||
      Date.parse(r.date) < today - 14 * MARITIME_DAY ||
      Date.parse(r.date) > today - 4 * MARITIME_DAY ||
      !ports.includes(r.portid as (typeof ports)[number]) ||
      !Number.isSafeInteger(r.portcalls) ||
      (r.portcalls as number) < 0 ||
      (r.portcalls as number) > 50_000 ||
      seen.has(`${r.date}:${r.portid}`)
    )
      throw Error('Invalid port estimate')
    seen.add(`${r.date}:${r.portid}`)
  }
  const day = rows
    .map((r) => r.date as string)
    .sort()
    .at(-1)!
  const latest = rows.filter((r) => r.date === day)
  if (latest.length !== ports.length) throw Error('Incomplete latest day')
  return {
    interval_start: new Date(day).toISOString(),
    interval_end: new Date(Date.parse(day) + MARITIME_DAY).toISOString(),
    covered_ports: 5,
    rows: Object.entries(maritimeRegions).flatMap(([region, config]) => {
      const total = latest
        .filter((r) =>
          (config.ports as readonly string[]).includes(r.portid as string),
        )
        .reduce((n, r) => n + (r.portcalls as number), 0)
      return total >= 20 ? [{ region, count: Math.floor(total / 10) * 10 }] : []
    }),
  }
}
export function ingestMaritime(
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  return ingestSource(
    {
      source: 'maritime',
      url: maritimeURL(now),
      maxBytes: 50_000,
      publicationMaxBytes: MARITIME_MAX_BYTES,
      parse: (p, t) => parseMaritime(extractMaritime(p, t), t),
      validate: () => {},
      publish: publishMaritime,
      decode: decodeMaritime,
    },
    fetcher,
    now,
  )
}
