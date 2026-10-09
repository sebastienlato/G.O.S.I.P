import { afterEach, describe, expect, it, vi } from 'vitest'
import { feed, quake, TEST_NOW } from '../../tests/fixtures/usgs'
import { filterEvents } from './events'
import { demoEvents } from '../../tests/fixtures/legacy/events'
import {
  createUSGSProvider,
  MAX_BYTES,
  MAX_RECORDS,
  parseUSGS,
  REFRESH_MS,
  snapshotIsStale,
  STALE_MS,
  USGS_URL,
} from './usgs'

afterEach(() => vi.useRealTimers())
describe('USGS observation boundary', () => {
  it('preserves provenance, estimates, review status and three distinct timestamps', () => {
    const snapshot = parseUSGS(feed(), TEST_NOW + 1000)
    expect(snapshot.events[0]).toMatchObject({
      provider_id: 'test001',
      is_demo: false,
      status: 'reviewed',
      network: 'test',
      provider_code: '001',
      magnitude: 4.7,
      magnitude_type: 'mb',
      depth_km: 12.5,
      country: '',
      coordinates: [142, 38],
      collected_at: new Date(TEST_NOW + 1000).toISOString(),
      feed_generated_at: new Date(TEST_NOW).toISOString(),
    })
    expect(snapshot.events[0].updated_at).not.toBe(
      snapshot.events[0].occurred_at,
    )
    expect(snapshot.rejected).toBe(0)
  })
  it('never fills absent measurements or update/review data with invented values', () => {
    const q = quake('missing', {
      mag: null,
      magType: null,
      place: null,
      updated: null,
      status: null,
      net: null,
      code: null,
    })
    q.geometry.coordinates[2] = null as unknown as number
    const e = parseUSGS(feed([q]), TEST_NOW).events[0]
    expect(e.magnitude).toBeNull()
    expect(e.depth_km).toBeNull()
    expect(e.updated_at).toBeNull()
    expect(e.status).toBeNull()
    expect(e.title).toContain('unavailable')
  })
  it.each([
    { mag: '4.7' },
    { mag: Infinity },
    { time: 'yesterday' },
    { time: TEST_NOW + 600_000 },
    { updated: TEST_NOW - 7200_000 },
    { place: 'x'.repeat(301) },
    { url: 'javascript:alert(1)' },
    { url: 'https://earthquake.usgs.gov.evil.test/earthquakes/eventpage/x' },
    { url: 'https://me:secret@earthquake.usgs.gov/earthquakes/eventpage/x' },
  ])(
    'rejects invalid records while preserving valid observations: %j',
    (properties) => {
      const result = parseUSGS(
        feed([quake(), quake('bad', properties)]),
        TEST_NOW,
      )
      expect(result.events).toHaveLength(1)
      expect(result.rejected).toBe(1)
    },
  )
  it('rejects bad coordinates, duplicate IDs and invalid envelopes, without silently truncating', () => {
    const invalid = quake('bad')
    invalid.geometry.coordinates = [181, NaN, 10]
    expect(
      parseUSGS(feed([quake(), quake(), invalid]), TEST_NOW).rejected,
    ).toBe(2)
    expect(() => parseUSGS(feed([invalid]), TEST_NOW)).toThrow(/No valid/)
    expect(() =>
      parseUSGS(feed(Array(MAX_RECORDS + 1).fill(quake())), TEST_NOW),
    ).toThrow()
    expect(() =>
      parseUSGS(
        { ...feed(), metadata: { status: 200, count: 2, generated: TEST_NOW } },
        TEST_NOW,
      ),
    ).toThrow()
    expect(() => parseUSGS(feed([], TEST_NOW + 600_000), TEST_NOW)).toThrow()
  })
  it('accepts negative depth and exposes withdrawal status; excludes non-earthquake types', () => {
    const q = quake('withdrawn', { status: 'deleted' })
    q.geometry.coordinates[2] = -1.2
    const result = parseUSGS(
      feed([q, quake('blast', { type: 'quarry blast' })]),
      TEST_NOW,
    )
    expect(result.events[0]).toMatchObject({
      status: 'deleted',
      depth_km: -1.2,
    })
    expect(result.excluded).toBe(1)
    expect(parseUSGS(feed([]), TEST_NOW).events).toEqual([])
  })
  it('filters observations using actual time, leaves demo time fixed and evaluates provider freshness', () => {
    const snapshot = parseUSGS(
      feed([quake(), quake('old', { time: TEST_NOW - 48 * 3600_000 })]),
      TEST_NOW,
    )
    expect(
      filterEvents(snapshot.events, '', ['physical'], 24, TEST_NOW),
    ).toHaveLength(1)
    expect(
      filterEvents(snapshot.events, '', ['physical'], 168, TEST_NOW),
    ).toHaveLength(2)
    expect(filterEvents(demoEvents, '', ['physical'], 24)).toHaveLength(2)
    expect(snapshotIsStale(snapshot, TEST_NOW + STALE_MS + 1)).toBe(true)
    expect(
      snapshotIsStale(
        parseUSGS(feed([], TEST_NOW - STALE_MS - 1), TEST_NOW),
        TEST_NOW,
      ),
    ).toBe(true)
    expect(snapshotIsStale(snapshot, TEST_NOW)).toBe(false)
  })
})
describe('bounded client provider', () => {
  it('deduplicates in-flight requests, throttles attempts, and replaces the snapshot on refresh', async () => {
    let now = TEST_NOW
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(feed())))
      .mockResolvedValueOnce(new Response(JSON.stringify(feed([]))))
    const provider = createUSGSProvider(fetcher, () => now)
    const first = provider.load()
    expect(provider.load()).toBe(first)
    expect((await first).events).toHaveLength(1)
    await expect(provider.load()).rejects.toThrow(/wait/)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(fetcher).toHaveBeenCalledWith(
      USGS_URL,
      expect.objectContaining({
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      }),
    )
    now += REFRESH_MS
    expect((await provider.load()).events).toHaveLength(0)
  })
  it('honours rate-limit backoff and Retry-After without automatic retries', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('', { status: 429, headers: { 'Retry-After': '900' } }),
      )
    const provider = createUSGSProvider(fetcher, () => TEST_NOW)
    await expect(provider.load()).rejects.toThrow(/429/)
    expect(provider.retryAt).toBe(TEST_NOW + 900_000)
    await expect(provider.load()).rejects.toThrow(/wait/)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('bounds actual streamed bytes even without a Content-Length header', async () => {
    const provider = createUSGSProvider(
      async () => new Response('x'.repeat(MAX_BYTES + 1)),
    )
    await expect(provider.load()).rejects.toThrow(/size limit/)
  })
  it('rejects malformed JSON and network failure without supplying fake observations', async () => {
    const invalid = createUSGSProvider(async () => new Response('{bad'))
    await expect(invalid.load()).rejects.toThrow(/invalid feed/)
    const offline = createUSGSProvider(async () => {
      throw new TypeError('offline')
    })
    await expect(offline.load()).rejects.toThrow(/network failure/)
  })
  it('aborts a hanging request after 12 seconds', async () => {
    vi.useFakeTimers()
    const provider = createUSGSProvider(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          )
        }),
    )
    const assertion = expect(provider.load()).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(12_000)
    await assertion
  })
})
