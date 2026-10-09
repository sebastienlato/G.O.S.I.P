import {
  FIRMS_PRODUCT,
  FIRMS_AREA,
  FIRMS_MAX_BYTES,
  parseFIRMS,
  publishFIRMS,
  decodeFIRMS,
} from '../src/data/firms'
import { ingestSource } from './source'
export const fireDay = (now: number) => new Date(now).toISOString().slice(0, 10)
export const FIRMS_INPUT_BYTES = 64_000_000
export const FIRMS_INPUT_ROWS = 500_000
// Each raw row is validated and discarded. Only coarse cells survive publication.
function accumulator(now: number) {
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
  const cells = new Map<string, number[]>()
  const seen = new Set<string>()
  let rows = 0
  let headerSeen = false
  function line(line: string) {
    if (!headerSeen) {
      if (line !== expected.join(',')) throw Error('Unknown CSV schema')
      headerSeen = true
      return
    }
    if (!line) return
    if (++rows > FIRMS_INPUT_ROWS) throw Error('Too many rows')
    const header = expected
    const row = line.split(',')
    if (
      row.length !== header.length ||
      row.some((v) => /["<>\u0000-\u001f]/.test(v))
    )
      throw Error('Malformed CSV')
    const [latitude, longitude] = row.map(Number),
      clock = row[6].padStart(4, '0')
    const validFields: Record<string, boolean> = {
      coordinates:
        !!row[0] &&
        !!row[1] &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180,
      date: /^\d{4}-\d{2}-\d{2}$/.test(row[5]),
      clock:
        /^\d{1,4}$/.test(row[6]) &&
        /^\d{4}$/.test(clock) &&
        Number(clock.slice(0, 2)) <= 23 &&
        Number(clock.slice(2)) <= 59,
      satellite: ['1', 'N20', 'NOAA-20'].includes(row[7]),
      instrument: row[8] === 'VIIRS',
      confidence: ['l', 'n', 'h'].includes(row[9]),
      version: /^2\.[01](NRT|RT|URT)$/.test(row[10]),
      daynight: ['D', 'N'].includes(row[13]),
    }
    for (const [field, valid] of Object.entries(validFields))
      if (!valid) {
        // Only a short numeric version identifier can leave this runner; never a row or request URL.
        if (field === 'version' && /^[0-9.]{1,8}(NRT|RT|URT)?$/.test(row[10])) throw Error(`Unsupported FIRMS version ${row[10]}`)
        throw Error(`Invalid FIRMS ${field}`)
      }
    for (const i of [2, 3, 4, 11, 12])
      if (
        !row[i] ||
        !Number.isFinite(Number(row[i])) ||
        Number(row[i]) < 0 ||
        Number(row[i]) > 100000
      )
        throw Error('Invalid measure')
    const observed = Date.parse(
      `${row[5]}T${clock.slice(0, 2)}:${clock.slice(2)}:00.000Z`,
    )
    if (
      !Number.isFinite(observed) ||
      new Date(observed).toISOString().slice(0, 10) !== row[5] ||
      observed > now
    )
      throw Error('Invalid FIRMS observation time')
    if (observed < now - 86400_000) return
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
  function finish() {
    if (!headerSeen) throw Error('Unexpected FIRMS response')
    if (rows > 0 && seen.size === 0) throw Error('Invalid observation')
    return {
      product: FIRMS_PRODUCT,
      area: FIRMS_AREA,
      interval_start: new Date(now - 86400_000).toISOString(),
      interval_end: new Date(now).toISOString(),
      cells: [...cells.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]),
    }
  }
  return { line, finish }
}
export function aggregateFIRMS(raw: string, now: number) {
  const a = accumulator(now)
  raw.trimEnd().split(/\r?\n/).forEach(a.line)
  return a.finish()
}
export async function streamFIRMS(response: Response, now: number) {
  if (!response.ok) throw Error(`HTTP ${response.status}`)
  if (Number(response.headers.get('content-length')) > FIRMS_INPUT_BYTES)
    throw Error('Response too large')
  const reader = response.body?.getReader()
  if (!reader) throw Error('Missing body')
  const a = accumulator(now),
    decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0,
    pending = ''
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (bytes > FIRMS_INPUT_BYTES) throw Error('Response too large')
      pending += decoder.decode(chunk.value, { stream: true })
      let end: number
      while ((end = pending.indexOf('\n')) >= 0) {
        a.line(pending.slice(0, end).replace(/\r$/, ''))
        pending = pending.slice(end + 1)
      }
      if (pending.length > 1024) throw Error('Malformed CSV')
    }
    pending += decoder.decode()
    if (pending) a.line(pending.replace(/\r$/, ''))
    return a.finish()
  } finally {
    await reader.cancel().catch(() => {})
  }
}
export const ingestFIRMS = (
  key: string | undefined,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) => {
  const validKey = typeof key === 'string' && /^[a-f0-9]{32}$/i.test(key)
  return ingestSource(
    {
      source: 'firms',
      url: validKey
        ? `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${FIRMS_PRODUCT}/${FIRMS_AREA}/2`
        : '',
      maxBytes: FIRMS_MAX_BYTES,
      publicationMaxBytes: FIRMS_MAX_BYTES,
      readResponse: streamFIRMS,
      parse: parseFIRMS,
      publish: publishFIRMS,
      decode: decodeFIRMS,
      validate(s) {
        if (s.feed.interval_end !== new Date(now).toISOString())
          throw Error('Wrong window')
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
