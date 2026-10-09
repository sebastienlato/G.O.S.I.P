import { expect, it, vi } from 'vitest'
import { ingestOoni, extractOoni } from './ooni'
import {
  parseOoni,
  decodeOoni,
  ooniWindow,
  OONI_CREDIT,
  OONI_DAY_MS,
} from '../src/data/ooni'
import { filterEvents, eventTime, eventBadge } from '../src/data/events'
import { parseNews } from '../src/data/news'
import { encode, ooniColor } from '../src/state/encoding'
const now = Date.parse('2026-10-09T12:00:00Z')
const row = (probe_cc = 'CA', measurement_count = 2000) => ({
  probe_cc,
  measurement_count,
  anomaly_count: 2,
  confirmed_count: 1,
  failure_count: 1,
  ok_count: measurement_count - 4,
})
const response = {
  v: 0,
  dimension_count: 1,
  result: [row(), row('US', 999), row('SG')],
}
const stub = (f: (url: string) => Response) =>
  vi.fn((u: unknown) =>
    Promise.resolve(f(String(u))),
  ) as unknown as typeof fetch
it('uses one fixed aggregate country query and emits only delayed totals with separate licensing and context', async () => {
  const fetcher = stub(() => new Response(JSON.stringify(response)))
  const p = await ingestOoni(fetcher, now)
  expect(fetcher).toHaveBeenCalledTimes(1)
  const [url, options] = vi.mocked(fetcher).mock.calls[0]
  const u = new URL(String(url))
  expect(u.origin + u.pathname).toBe('https://api.ooni.io/api/v1/aggregation')
  expect(Object.fromEntries(u.searchParams)).toEqual({
    since: '2026-10-07',
    until: '2026-10-08',
    axis_x: 'probe_cc',
    test_name: 'web_connectivity',
  })
  expect(options?.headers).toHaveProperty('User-Agent')
  expect(p.health).toMatchObject({
    source: 'ooni',
    status: 'ok',
    record_count: 2,
    generated_at: null,
  })
  expect(p.snapshot.credit).toEqual(OONI_CREDIT)
  expect(p.snapshot.feed.reported_countries).toBe(3)
  expect(p.snapshot.feed.rows).toEqual([
    { country_code: 'CA', measurement_count: 2000 },
    { country_code: 'SG', measurement_count: 2000 },
  ])
  for (const key of [
    'probe_cc',
    'anomaly_count',
    'confirmed_count',
    'probe_asn',
    'input',
  ])
    expect(JSON.stringify(p)).not.toContain(`"${key}"`)
  const s = decodeOoni(JSON.stringify(p), now).snapshot!
  expect(s.events[0]).toMatchObject({
    occurred_at: null,
    published_at: null,
    updated_at: null,
    category: 'digital',
    is_demo: false,
  })
  expect(s.events[0].coordinates).toEqual([-102, 60])
  expect(s.events[1].coordinates).toBeNull()
  expect(eventTime(s.events[0])).toBe('2026-10-08T00:00:00.000Z')
  expect(eventBadge(s.events[0])).toBe('AGGREGATE MEASUREMENTS · OONI')
  expect(encode(s.events[0], now, eventTime(s.events[0]))).toMatchObject({
    kind: 'ooni',
    color: ooniColor,
    recent: false,
  })
})
it('keeps UTC boundaries, coverage and combined source windows honest', () => {
  expect(ooniWindow(now)).toEqual({
    interval_start: '2026-10-07T00:00:00.000Z',
    interval_end: '2026-10-08T00:00:00.000Z',
  })
  expect(ooniWindow(Date.parse('2026-10-09T00:00:00Z'))).toEqual(
    ooniWindow(now),
  )
  const digital = parseOoni(extractOoni(response, now), now).events
  const news = parseNews(
    [
      {
        title: 'Test',
        author: 'Writer',
        url: 'https://globalvoices.org/2026/10/07/test/',
        published_at: '2026-10-07T12:00:00.000Z',
      },
    ],
    now,
  ).events
  const combined = [...digital, ...news]
  expect(
    filterEvents(combined, '', ['digital', 'civic'], 24, now),
  ).toHaveLength(0)
  expect(
    filterEvents(combined, '', ['digital', 'civic'], 72, now),
  ).toHaveLength(3)
  expect(
    filterEvents(combined, 'canada', ['digital', 'civic'], 72, now),
  ).toHaveLength(1)
  expect(filterEvents(combined, '', ['civic'], 72, now)).toHaveLength(1)
  expect(
    filterEvents(digital, '', ['digital'], 168, now + 7 * OONI_DAY_MS),
  ).toHaveLength(0)
})
it.each(['network', '429', 'invalid', 'oversized', 'empty'])(
  'retains last-good data and original times after %s failure',
  async (failure) => {
    const prior = await ingestOoni(
      stub(() => new Response(JSON.stringify(response))),
      now,
    )
    const p = await ingestOoni(
      stub((url) => {
        if (url.includes('github.io'))
          return new Response(JSON.stringify(prior))
        if (failure === 'network') throw Error('PRIVATE PROVIDER INPUT')
        if (failure === '429') return new Response('', { status: 429 })
        if (failure === 'oversized')
          return new Response('', { headers: { 'Content-Length': '100001' } })
        if (failure === 'empty')
          return new Response(JSON.stringify({ ...response, result: [] }))
        return new Response('bad')
      }),
      now + 3600000,
    )
    expect(p.health.status).toBe('stale')
    expect(p.health.fetched_at).toBe(prior.health.fetched_at)
    expect(p.snapshot).toEqual(prior.snapshot)
    expect(JSON.stringify(p)).not.toContain('PRIVATE')
  },
)
it('rejects raw dimensions, malformed counts, duplicates, excess rows and missing licence or interval integrity', async () => {
  for (const bad of [
    { ...response, dimension_count: 2 },
    { ...response, result: [{ ...row(), probe_asn: 123 }] },
    { ...response, result: [row('ZZ')] },
    { ...response, result: [row(), row()] },
    { ...response, result: Array.from({ length: 251 }, () => row()) },
    { ...response, result: [{ ...row(), ok_count: 1 }] },
    { ...response, result: [{ ...row(), anomaly_count: -1 }] },
    { ...response, result: [{ ...row(), measurement_count: 2.5 }] },
  ])
    expect(() => extractOoni(bad, now)).toThrow()
  const f = extractOoni(response, now)
  for (const bad of [
    { ...f, interval_end: new Date(now).toISOString() },
    { ...f, interval_start: '2026-10-06T00:00:00.000Z' },
    { ...f, rows: [{ country_code: 'CA', measurement_count: 999 }] },
    { ...f, rows: [{ ...f.rows[0], coordinates: [1, 1] }] },
  ])
    expect(() => parseOoni(bad, now)).toThrow()
  const p = await ingestOoni(
    stub(() => new Response(JSON.stringify(response))),
    now,
  )
  for (const bad of [
    { ...p, health: { ...p.health, record_count: 99 } },
    { ...p, snapshot: { ...p.snapshot, credit: null } },
    {
      ...p,
      health: { ...p.health, generated_at: new Date(now).toISOString() },
    },
    {
      ...p,
      snapshot: {
        ...p.snapshot,
        feed: { ...f, rows: [{ country_code: 'CA', measurement_count: 999 }] },
      },
    },
  ])
    expect(() => decodeOoni(JSON.stringify(bad), now)).toThrow()
  const failed = await ingestOoni(
    stub(() => new Response('bad')),
    now,
  )
  expect(failed).toMatchObject({
    snapshot: null,
    health: { status: 'failed', record_count: 0, fetched_at: null },
  })
  const suppressed = await ingestOoni(
    stub(
      () =>
        new Response(JSON.stringify({ ...response, result: [row('CA', 999)] })),
    ),
    now,
  )
  expect(suppressed.health).toMatchObject({ status: 'ok', record_count: 0 })
  expect(suppressed.snapshot.feed.reported_countries).toBe(1)
})
