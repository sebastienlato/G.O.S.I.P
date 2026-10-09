import { expect, it } from 'vitest'
import { ingestDWD } from './dwd'
import { ingestFIRMS, aggregateFIRMS, fireDay } from './firms'
import { parseDWD, decodeDWD, decodeDWDResponse } from '../src/data/dwd'
import { decodeFIRMS, parseFIRMS } from '../src/data/firms'
import { filterEvents, eventBadge, locationMeaning } from '../src/data/events'
import {
  categoryKeys,
  parseFilters,
  serializeFilters,
} from '../src/state/explorer'
import { dwdFixture, firmsCSV } from '../tests/fixtures/phase14'
const now = Date.parse('2026-10-09T12:00:00.000Z'),
  day = fireDay(now)
const key = '0'.repeat(32) // Deliberately fake test credential.
const stub = (
  fn: (url: string, options?: RequestInit) => Response | Promise<Response>,
) =>
  ((url, options) => Promise.resolve(fn(String(url), options))) as typeof fetch
const dwd = () =>
  new Response(`warnWetter.loadWarnings(${JSON.stringify(dwdFixture(now))});`)
const fire = () => new Response(firmsCSV(day))
it('preserves DWD validity, unknown end and provenance with no invented point or issue time', () => {
  const f = dwdFixture(now)
  const s = parseDWD(f, now)
  expect(s.events[0]).toMatchObject({
    occurred_at: null,
    published_at: null,
    updated_at: null,
    coordinates: null,
    altitude_start: null,
  })
  expect(
    filterEvents(s.events, 'testbezirk', categoryKeys, 6, now),
  ).toHaveLength(1)
  expect(
    filterEvents(s.events, '', categoryKeys, 6, now + 3600000),
  ).toHaveLength(0)
  const raw = JSON.parse(JSON.stringify(f))
  raw.warnings['100000001'][0].end = null
  expect(parseDWD(raw, now).events[0].valid_until).toBeNull()
  expect(eventBadge(s.events[0])).toBe('WEATHER WARNING · DWD')
  expect(locationMeaning(s.events[0])).toContain('feed only')
})
it('filters upcoming warnings forward and thermal days backward without merging', () => {
  const f = dwdFixture(now)
  f.warnings['100000001'][0].start = now + 12 * 3600000
  f.warnings['100000001'][0].end = now + 24 * 3600000
  const warning = parseDWD(f, now).events,
    fires = parseFIRMS(aggregateFIRMS(firmsCSV(day), now), now).events
  expect(
    filterEvents([...warning, ...fires], '', categoryKeys, 6, now),
  ).toHaveLength(1)
  expect(
    filterEvents([...warning, ...fires], '', categoryKeys, 24, now),
  ).toHaveLength(2)
  expect(
    filterEvents([...warning, ...fires], '', categoryKeys, 72, now),
  ).toHaveLength(2)
  expect(
    filterEvents([...warning, ...fires], '', ['physical'], 72, now),
  ).toHaveLength(0)
  const parsed = parseFilters('?live=dwd')
  expect(parseFilters(serializeFilters(parsed))).toEqual(parsed)
})
it('only publishes delayed 2 degree daily counts, not precise observations or secret', async () => {
  const result = await ingestFIRMS(
    key,
    stub((url, options) => {
      expect(url).toContain(`/world/2`)
      expect(options?.redirect).toBe('error')
      expect(options?.headers).toHaveProperty('User-Agent')
      return fire()
    }),
    now,
  )
  expect(result.health).toMatchObject({
    status: 'ok',
    record_count: 1,
    generated_at: null,
  })
  const s = decodeFIRMS(JSON.stringify(result), now).snapshot!
  expect(s.events[0]).toMatchObject({
    coordinates: [-101, 51],
    detection_count: 2,
    occurred_at: null,
  })
  for (const privateValue of [
    key,
    '50.1234',
    '-100.2345',
    '1201',
    'bright_ti4',
  ])
    expect(JSON.stringify(result)).not.toContain(privateValue)
  expect(() =>
    parseFIRMS({ ...s.feed, interval_end: '2026-10-10T12:00:00.000Z' }, now),
  ).toThrow('Invalid')
  expect(() => parseFIRMS({ ...s.feed, cells: [[20.2, 11, 2]] }, now)).toThrow()
})
it.each(['dwd', 'firms'] as const)(
  '%s accepts valid empty but rejects failed empty and mismatched health',
  async (source) => {
    const ingest =
      source === 'dwd'
        ? ingestDWD
        : (f: typeof fetch, t: number) => ingestFIRMS(key, f, t)
    const decode = source === 'dwd' ? decodeDWD : decodeFIRMS
    const response =
      source === 'dwd'
        ? new Response(
            `warnWetter.loadWarnings(${JSON.stringify({ ...dwdFixture(now), warnings: {} })});`,
          )
        : new Response(firmsCSV(day).split('\n')[0] + '\n')
    const result = await ingest(
      stub(() => response),
      now,
    )
    expect(result.health).toMatchObject({ status: 'ok', record_count: 0 })
    expect(result.snapshot).not.toBeNull()
    expect(() =>
      decode(
        JSON.stringify({
          ...result,
          health: { ...result.health, record_count: 3 },
        }),
        now,
      ),
    ).toThrow()
    const failed = await ingest(
      stub(() => new Response('{}')),
      now,
    )
    expect(failed.health.status).toBe('failed')
    expect(failed.snapshot).toBeNull()
  },
)
it.each(['429', 'network', 'oversized', 'invalid', 'stale'] as const)(
  'retains original DWD times and independent FIRMS data after %s',
  async (failure) => {
    for (const source of ['dwd', 'firms'] as const) {
      const ingest =
        source === 'dwd'
          ? ingestDWD
          : (f: typeof fetch, t: number) => ingestFIRMS(key, f, t)
      const previous = await ingest(stub(source === 'dwd' ? dwd : fire), now)
      const calls: string[] = []
      const result = await ingest(
        stub((url) => {
          calls.push(url)
          if (url.includes('github.io'))
            return new Response(JSON.stringify(previous))
          if (failure === 'network') throw Error('SECRET MUST NOT LEAK')
          if (failure === '429') return new Response('', { status: 429 })
          if (failure === 'oversized')
            return new Response('', {
              headers: { 'Content-Length': '9000000' },
            })
          if (failure === 'stale') return source === 'dwd' ? dwd() : fire()
          return new Response('bad')
        }),
        now + 86400000,
      )
      expect(calls).toHaveLength(2)
      expect(result.snapshot).toEqual(previous.snapshot)
      expect(result.health.status).toBe('stale')
      expect(result.health.fetched_at).toBe(previous.health.fetched_at)
      expect(result.health.error).not.toContain('SECRET')
    }
  },
)
it('rejects executable JSONP, unsafe text, malformed geometry/time/schema and duplicate detections', () => {
  expect(() =>
    decodeDWDResponse('warnWetter.loadWarnings({});alert(1)'),
  ).toThrow()
  const f = dwdFixture(now)
  f.warnings['100000001'][0].headline = '<img src=x>'
  expect(() => parseDWD(f, now)).toThrow()
  for (const csv of [
    firmsCSV(day).replace('50.1234', '1000'),
    firmsCSV(day).replace('0000', '2560'),
    firmsCSV(day).replace('0000', ''),
    firmsCSV(day).replace('N20', 'N21'),
    firmsCSV(day) + firmsCSV(day).split('\n')[1] + '\n',
  ])
    expect(() => aggregateFIRMS(csv, now)).toThrow()
})
it('missing key never requests FIRMS or reveals credentials; safe last-good fallback remains', async () => {
  const calls: string[] = []
  const result = await ingestFIRMS(
    undefined,
    stub((url) => {
      calls.push(url)
      return new Response('{}')
    }),
    now,
  )
  expect(calls).toEqual([
    'https://sebastienlato.github.io/G.O.S.I.P/data/firms.json',
  ])
  expect(result.health.status).toBe('failed')
})
