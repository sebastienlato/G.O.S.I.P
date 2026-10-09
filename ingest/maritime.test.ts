import { expect, it, vi } from 'vitest'
import { ingestMaritime, extractMaritime, maritimeURL } from './maritime'
import {
  parseMaritime,
  decodeMaritime,
  MARITIME_DAY,
} from '../src/data/maritime'
import { maritimeFixture } from '../tests/fixtures/maritime'
import { filterEvents, eventBadge, eventTime } from '../src/data/events'
import { parseOoni, ooniWindow } from '../src/data/ooni'
const now = Date.parse('2026-10-09T12:00:00Z')
const stub = (fn: (url: string) => Response) =>
  vi.fn(async (url: string | URL | Request) =>
    fn(String(url)),
  ) as unknown as typeof fetch
it('publishes only delayed, rounded regional estimates with distinct unknown times and five-gateway coverage', async () => {
  const f = stub(() => new Response(JSON.stringify(maritimeFixture(now))))
  const p = await ingestMaritime(f, now)
  expect(p.health).toMatchObject({
    status: 'ok',
    record_count: 3,
    generated_at: null,
  })
  expect(p.snapshot.feed.rows.map((r: { count: number }) => r.count)).toEqual([
    130, 110, 100,
  ])
  expect(f).toHaveBeenCalledTimes(1)
  const url = new URL(maritimeURL(now))
  expect(url.searchParams.get('where')).toContain("date <= DATE '2026-10-05'")
  expect(url.searchParams.get('returnGeometry')).toBe('false')
  for (const secret of [
    'port1114',
    'portcalls',
    'attributes',
    'vessel',
    'latitude',
  ])
    expect(JSON.stringify(p.snapshot.feed)).not.toContain(secret)
  const s = decodeMaritime(JSON.stringify(p), now).snapshot!
  expect(s.events[0]).toMatchObject({
    occurred_at: null,
    published_at: null,
    updated_at: null,
    coordinates: [5, 55],
  })
  expect(eventBadge(s.events[0])).toBe('ESTIMATED PORT CALLS · PORTWATCH')
  expect(eventTime(s.events[0])).toBe(s.feed.interval_end)
})
it('rejects empty, incomplete newest day, overflow, duplicates, invalid dates, unselected ports and null estimates', () => {
  const b = maritimeFixture(now),
    r = b.features[0]
  for (const p of [
    { features: [] },
    { features: b.features.slice(1) },
    { ...b, exceededTransferLimit: true },
    { features: [...b.features, r] },
    { features: Array(71).fill(r) },
    {
      features: [
        ...b.features,
        { attributes: { ...r.attributes, date: '2026-10-05' } },
      ],
    },
    ...[
      { date: '2026-02-30' },
      { date: '2026-10-09' },
      { date: '2026-09-01' },
      { portid: 'evil' },
      { portcalls: null },
      { portcalls: -1 },
      { portcalls: 1.5 },
    ].map((change) => ({
      features: [
        { attributes: { ...r.attributes, ...change } },
        ...b.features.slice(1),
      ],
    })),
  ])
    expect(() => extractMaritime(p, now)).toThrow()
})
it('suppresses small totals and keeps genuine all-suppressed coverage separate from failure', async () => {
  const p = await ingestMaritime(
    stub(
      () => new Response(JSON.stringify(maritimeFixture(now, [1, 2, 3, 4, 5]))),
    ),
    now,
  )
  expect(p.health).toMatchObject({ status: 'ok', record_count: 0 })
  expect(p.snapshot.feed.covered_ports).toBe(5)
})
it('rejects publication precision, delay, credit and health tampering', async () => {
  const p = await ingestMaritime(
    stub(() => new Response(JSON.stringify(maritimeFixture(now)))),
    now,
  )
  const feed = p.snapshot.feed
  for (const f of [
    { ...feed, rows: [{ region: 'north-sea', count: 131 }] },
    { ...feed, covered_ports: 4 },
    { ...feed, rows: [{ region: 'north-sea', count: 10 }] },
    { ...feed, rows: [{ ...feed.rows[0], ship_id: 'secret' }] },
    { ...feed, interval_end: new Date(now - MARITIME_DAY).toISOString() },
    { ...feed, rows: [feed.rows[0], feed.rows[0]] },
  ])
    expect(() => parseMaritime(f, now)).toThrow()
  for (const bad of [
    { ...p, health: { ...p.health, record_count: 2 } },
    { ...p, snapshot: { ...p.snapshot, credit: null } },
    {
      ...p,
      health: { ...p.health, generated_at: new Date(now).toISOString() },
    },
    { ...p, snapshot: null },
  ])
    expect(() => decodeMaritime(JSON.stringify(bad), now)).toThrow()
  expect(() => decodeMaritime(' '.repeat(30001), now)).toThrow()
})
it.each(['429', 'oversize', 'invalid', 'network'])(
  'retains original data/time on %s failure and fails null without last-good',
  async (failure) => {
    const prior = await ingestMaritime(
      stub(() => new Response(JSON.stringify(maritimeFixture(now)))),
      now,
    )
    const f = stub((url) => {
      if (url.includes('github.io')) return new Response(JSON.stringify(prior))
      if (failure === 'network') throw Error('secret input')
      if (failure === '429') return new Response('', { status: 429 })
      if (failure === 'oversize')
        return new Response('', { headers: { 'Content-Length': '50001' } })
      return new Response('bad')
    })
    const next = await ingestMaritime(f, now + 3600000)
    expect(next.snapshot).toEqual(prior.snapshot)
    expect(next.health).toMatchObject({
      status: 'stale',
      fetched_at: prior.health.fetched_at,
    })
    expect(JSON.stringify(next)).not.toContain('secret input')
    expect(f).toHaveBeenCalledTimes(2)
    const fail = await ingestMaritime(
      stub(() => new Response('bad')),
      now,
    )
    expect(fail).toMatchObject({
      snapshot: null,
      health: { status: 'failed', record_count: 0 },
    })
  },
)
it('combines real sources using their own windows, categories and text without merging', () => {
  const ships = parseMaritime(
    extractMaritime(maritimeFixture(now), now),
    now,
  ).events
  const digital = parseOoni(
    {
      ...ooniWindow(now),
      test_name: 'web_connectivity',
      reported_countries: 1,
      rows: [{ country_code: 'CA', measurement_count: 1000 }],
    },
    now,
  ).events
  const all = [...ships, ...digital]
  expect(filterEvents(all, '', ['physical', 'digital'], 168, now)).toHaveLength(
    4,
  )
  expect(filterEvents(all, '', ['physical', 'digital'], 72, now)).toHaveLength(
    1,
  )
  expect(filterEvents(all, 'north sea', ['physical'], 168, now)).toHaveLength(1)
  expect(filterEvents(all, '', [], 168, now)).toHaveLength(0)
})
