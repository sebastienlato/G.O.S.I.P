import { expect, it, vi } from 'vitest'
import { extractLaunches, ingestLaunches, LAUNCH_URL } from './launches'
import {
  decodeLaunches,
  parseLaunches,
  launchTimeLabel,
  launchMatches,
  LAUNCH_CREDIT,
} from '../src/data/launches'
import { launchFixture } from '../tests/fixtures/launches'
import {
  filterEvents,
  eventBadge,
  eventTime,
  markerLabel,
} from '../src/data/events'
import { parseUSGS } from '../src/data/usgs'
import recorded from '../tests/fixtures/usgs-recorded.json'
const now = recorded.metadata.generated + 1000
const fixture = () => launchFixture(now)
const stub = (f: (u: string) => Response) =>
  vi.fn((u: unknown) =>
    Promise.resolve(f(String(u))),
  ) as unknown as typeof fetch
it('publishes bounded selected schedules with rounded sites, credit and separate unknown observation times', async () => {
  const f = stub(() => new Response(JSON.stringify(fixture())))
  const p = await ingestLaunches(f, now)
  expect(f).toHaveBeenCalledTimes(1)
  expect(vi.mocked(f).mock.calls[0][0]).toBe(LAUNCH_URL)
  expect(vi.mocked(f).mock.calls[0][1]?.headers).toHaveProperty('User-Agent')
  expect(p.health).toMatchObject({
    status: 'ok',
    record_count: 1,
    generated_at: null,
  })
  expect(p.snapshot.credit).toBe(LAUNCH_CREDIT)
  const e = decodeLaunches(JSON.stringify(p), now).snapshot!.events[0]
  expect(e).toMatchObject({
    coordinates: [-81, 29],
    occurred_at: null,
    published_at: null,
    is_demo: false,
    precision: 'Minute',
  })
  expect(e.updated_at).toBe(fixture().results[0].last_updated)
  expect(eventBadge(e)).toBe('SCHEDULED LAUNCH · LL2')
  expect(markerLabel(e)).toContain('site context')
  expect(eventTime(e)).toBe(e.net)
  for (const field of [
    'image',
    'orbit',
    'rocket',
    'latitude',
    'longitude',
    'description',
  ])
    expect(JSON.stringify(p)).not.toContain(`"${field}"`)
})
it('omits unknown, military, crew, coarse dates and non-Earth schedules; never publishes launch outcomes', () => {
  for (const patch of [
    { mission: { type: 'Government/Top Secret' } },
    { mission: { type: 'Unknown' } },
    { mission: { type: 'Human Exploration' } },
    { mission: { type: 'Resupply' } },
    { net_precision: { name: 'Month' } },
    { status: { id: 3 } },
    { status: { id: 6 } },
    {
      pad: {
        ...fixture().results[0].pad,
        location: {
          ...fixture().results[0].pad.location,
          celestial_body: { id: 2 },
        },
      },
    },
  ]) {
    expect(
      extractLaunches({
        count: 1,
        results: [{ ...fixture().results[0], ...patch }],
      }).rows,
    ).toEqual([])
  }
})
it('combines forward schedule precision intervals with backward observations and search/category filters', () => {
  const schedule = parseLaunches(extractLaunches(fixture()), now).events
  const quakes = parseUSGS(recorded, now).events
  const all = [...schedule, ...quakes]
  expect(filterEvents(all, '', ['science'], 24, now)).toHaveLength(0)
  expect(filterEvents(all, '', ['science'], 72, now)).toHaveLength(1)
  expect(
    filterEvents(all, 'test spaceport', ['science', 'physical'], 72, now),
  ).toHaveLength(1)
  expect(filterEvents(all, '', ['science', 'physical'], 72, now).length).toBe(
    filterEvents(quakes, '', ['physical'], 72, now).length + 1,
  )
  expect(launchMatches(schedule[0], now + 49 * 3600000, 72)).toBe(false)
  const day = {
    ...schedule[0],
    net: new Date(now).toISOString(),
    precision: 'Day' as const,
  }
  expect(launchMatches(day, now, 6)).toBe(true)
  expect(launchTimeLabel(day)).not.toContain('00:00')
  const unknown = {
    ...schedule[0],
    net: null,
    precision: null,
    coordinates: null,
    updated_at: null,
  }
  expect(filterEvents([unknown], '', ['science'], 6, now)).toHaveLength(1)
  expect(launchTimeLabel(unknown)).toContain('unknown')
})
it.each(['429', 'invalid', 'oversize', 'network'])(
  'retains last-good original times on %s failure; never converts failure into empty success',
  async (failure) => {
    const prior = await ingestLaunches(
      stub(() => new Response(JSON.stringify(fixture()))),
      now,
    )
    const f = stub((url) => {
      if (url.includes('github.io')) return new Response(JSON.stringify(prior))
      if (failure === 'network') throw Error('SECRET INPUT')
      if (failure === '429') return new Response('', { status: 429 })
      if (failure === 'oversize')
        return new Response('', { headers: { 'Content-Length': '500001' } })
      return new Response('bad')
    })
    const p = await ingestLaunches(f, now + 3600000)
    expect(p.snapshot).toEqual(prior.snapshot)
    expect(p.health).toMatchObject({
      status: 'stale',
      fetched_at: prior.health.fetched_at,
    })
    expect(f).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(p)).not.toContain('SECRET')
    const fail = await ingestLaunches(
      stub(() => new Response('bad')),
      now,
    )
    expect(fail).toMatchObject({
      snapshot: null,
      health: { status: 'failed', record_count: 0 },
    })
  },
)
it('validates partial coverage, untrusted fields, duplicate IDs, bounds and health integrity', async () => {
  const base = fixture(),
    r = base.results[0]
  for (const bad of [
    { count: 20, results: [] },
    { count: 2, results: [r, r] },
    { count: 1, results: [{ ...r, name: '<script>' }] },
    { count: 1, results: [{ ...r, net: 'invalid' }] },
    {
      count: 1,
      results: [
        {
          ...r,
          pad: { ...r.pad, location: { ...r.pad.location, latitude: 91 } },
        },
      ],
    },
  ]) {
    expect(() => parseLaunches(extractLaunches(bad), now)).toThrow()
  }
  const feed = extractLaunches(base)
  expect(() =>
    parseLaunches(
      { ...feed, rows: [{ ...feed.rows[0], coordinates: [1.2, 3] }] },
      now,
    ),
  ).toThrow()
  expect(() =>
    parseLaunches({ ...feed, rows: [{ ...feed.rows[0], net: null }] }, now),
  ).toThrow()
  const p = await ingestLaunches(
    stub(() => new Response(JSON.stringify(base))),
    now,
  )
  for (const bad of [
    { ...p, health: { ...p.health, record_count: 5 } },
    { ...p, snapshot: { ...p.snapshot, credit: null } },
    {
      ...p,
      health: { ...p.health, generated_at: new Date(now).toISOString() },
    },
  ])
    expect(() => decodeLaunches(JSON.stringify(bad), now)).toThrow()
  const empty = await ingestLaunches(
    stub(() => new Response(JSON.stringify({ count: 0, results: [] }))),
    now,
  )
  expect(empty.health).toMatchObject({ status: 'ok', record_count: 0 })
})
