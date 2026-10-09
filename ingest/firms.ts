import {
  FIRMS_PRODUCT,
  FIRMS_AREA,
  FIRMS_MAX_BYTES,
  parseFIRMS,
  publishFIRMS,
  decodeFIRMS,
} from '../src/data/firms'
import { ingestSource } from './source'
export const fireDay = (now: number) =>
  new Date(now - 2 * 86400_000).toISOString().slice(0, 10)
// Provider rows never reach publications, logs or git. Only coarse daily counts survive.
export function aggregateFIRMS(raw: string, day: string) {
  const lines = raw.trim().split(/\r?\n/)
  if (lines.length < 1 || lines.length > 60001) throw Error('Too many rows')
  const header = lines.shift()!.split(',')
  const expected = [
    'latitude',
    'longitude',
    'bright_ti4',
    'scan',
    'track',
    'acq_date',
    'acq_time',
    'satellite',
    'instrument',
    'confidence',
    'version',
    'bright_ti5',
    'frp',
    'daynight',
  ]
  if (!raw.startsWith('latitude,')) throw Error('Unexpected FIRMS response')
  if (header.join(',') !== expected.join(',')) throw Error('Unknown CSV schema')
  const cells = new Map<string, number[]>()
  const seen = new Set<string>()
  for (const line of lines) {
    const row = line.split(',')
    if (
      row.length !== header.length ||
      row.some((v) => /["<>\u0000-\u001f]/.test(v))
    )
      throw Error('Malformed CSV')
    const [latitude, longitude] = row.map(Number),
      clock = row[6].padStart(4, '0')
    if (
      !row[0] ||
      !row[1] ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < 15 ||
      latitude > 75 ||
      longitude < -170 ||
      longitude > -50 ||
      row[5] !== day ||
      !/^\d{1,4}$/.test(row[6]) ||
      !/^\d{4}$/.test(clock) ||
      Number(clock.slice(0, 2)) > 23 ||
      Number(clock.slice(2)) > 59 ||
      !['1', 'N20', 'NOAA-20'].includes(row[7]) ||
      row[8] !== 'VIIRS' ||
      !['l', 'n', 'h'].includes(row[9]) ||
      !/^2\.0NRT$/.test(row[10]) ||
      !['D', 'N'].includes(row[13])
    )
      throw Error('Invalid observation')
    for (const i of [2, 3, 4, 11, 12])
      if (
        !row[i] ||
        !Number.isFinite(Number(row[i])) ||
        Number(row[i]) < 0 ||
        Number(row[i]) > 100000
      )
        throw Error('Invalid measure')
    const unique = [latitude, longitude, row[5], clock].join(',')
    if (seen.has(unique)) throw Error('Duplicate detection')
    seen.add(unique)
    const lon = Math.min(179, Math.floor((longitude + 180) / 2) * 2 - 179),
      lat = Math.min(89, Math.floor((latitude + 90) / 2) * 2 - 89),
      key = `${lon},${lat}`
    const cell = cells.get(key) ?? [lon, lat, 0]
    cell[2]++
    cells.set(key, cell)
  }
  return {
    product: FIRMS_PRODUCT,
    area: FIRMS_AREA,
    day,
    cells: [...cells.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]),
  }
}
export const ingestFIRMS = (
  key: string | undefined,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) => {
  const day = fireDay(now)
  const validKey = typeof key === 'string' && /^[a-f0-9]{32}$/i.test(key)
  return ingestSource(
    {
      source: 'firms',
      url: validKey
        ? `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${FIRMS_PRODUCT}/${FIRMS_AREA}/1/${day}`
        : '',
      maxBytes: 8_000_000,
      publicationMaxBytes: FIRMS_MAX_BYTES,
      decodeResponse: (raw) => aggregateFIRMS(raw, day),
      parse: parseFIRMS,
      publish: publishFIRMS,
      decode: decodeFIRMS,
      validate(s) {
        if (s.feed.day !== day) throw Error('Wrong day')
      },
    },
    validKey
      ? fetcher
      : (((url, options) => {
          if (String(url).startsWith('https://sebastienlato.github.io/'))
            return fetcher(url, options)
          return Promise.reject(Error('Key unavailable'))
        }) as typeof fetch),
    now,
  )
}
