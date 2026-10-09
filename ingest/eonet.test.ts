import { describe, it, expect } from 'vitest'
import { ingestEONET } from './eonet'
import {
  EONET_URL,
  EONET_MAX_BYTES,
  parseEONET,
  decodeEONET,
} from '../src/data/eonet'
import { eonetFixture } from '../tests/fixtures/eonet'
const now = Date.parse('2026-10-08T16:00:00.000Z')
const stub = (fn: (url: string) => Response | Promise<Response>) =>
  ((url: string | URL | Request) =>
    Promise.resolve(fn(String(url)))) as typeof fetch
const ok = () => new Response(JSON.stringify(eonetFixture(now)))
describe('EONET bounded ingestion and semantics', () => {
  it('keeps latest dated geometry, nulls, polygon feed-only and source semantics', () => {
    const fixture = eonetFixture(now)
    fixture.events[0].geometry.push({
      ...fixture.events[0].geometry[0],
      date: new Date(now - 3600_000).toISOString(),
      coordinates: [30, 20],
    })
    const snapshot = parseEONET(fixture, now)
    expect(snapshot.generated_at).toBeNull()
    expect(snapshot.events[0]).toMatchObject({
      coordinates: [30, 20],
      occurred_at: null,
      updated_at: null,
      magnitude: null,
      status: 'open',
      country: '',
    })
    expect(snapshot.events[1].coordinates).toBeNull()
    expect(snapshot.feed.events[0]).not.toHaveProperty('description')
    expect(JSON.stringify(snapshot.feed)).not.toContain('magnitudeDescription')
  })
  it('publishes, revalidates and accepts an explicitly empty catalog', async () => {
    const result = await ingestEONET(stub(ok), now)
    expect(
      decodeEONET(JSON.stringify(result), now).snapshot?.events,
    ).toHaveLength(3)
    const empty = await ingestEONET(
      stub(
        () =>
          new Response(JSON.stringify({ title: 'EONET Events', events: [] })),
      ),
      now,
    )
    expect(empty.health).toMatchObject({
      status: 'ok',
      record_count: 0,
      generated_at: null,
    })
    expect(empty.snapshot).not.toBeNull()
  })
  it.each([
    'malformed',
    'oversize',
    'truncated',
    'duplicate',
    'future',
    'unsafe-link',
    'unknown-category',
    'invalid-polygon',
    '429',
    'network',
  ])(
    'retains original retrieval and safe stale health after %s',
    async (failure) => {
      const previous = await ingestEONET(stub(ok), now)
      const calls: string[] = []
      const result = await ingestEONET(
        stub((url) => {
          calls.push(url)
          if (url.endsWith('/data/eonet.json'))
            return new Response(JSON.stringify(previous))
          if (failure === 'network') throw Error('secret detail')
          if (failure === '429') return new Response('', { status: 429 })
          if (failure === 'oversize')
            return new Response('x'.repeat(EONET_MAX_BYTES + 1))
          if (failure === 'malformed') return new Response('{}')
          const f = eonetFixture(now)
          if (failure === 'truncated') f.events = Array(201).fill(f.events[0])
          if (failure === 'duplicate') f.events.push(f.events[0])
          if (failure === 'future')
            f.events[0].geometry[0].date = new Date(
              now + 86400_000,
            ).toISOString()
          if (failure === 'unsafe-link')
            f.events[0].sources[0].url = 'javascript:alert(1)'
          if (failure === 'unknown-category')
            f.events[0].categories[0].id = 'wildfires'
          if (failure === 'invalid-polygon')
            f.events[1].geometry[0].coordinates = [
              [
                [999, 0],
                [21, 10],
                [21, 11],
                [999, 0],
              ],
            ]
          return new Response(JSON.stringify(f))
        }),
        now + 3600_000,
      )
      expect(calls).toEqual([
        EONET_URL,
        'https://sebastienlato.github.io/G.O.S.I.P/data/eonet.json',
      ])
      expect(result.snapshot).toEqual(previous.snapshot)
      expect(result.health).toMatchObject({
        status: 'stale',
        fetched_at: previous.health.fetched_at,
        generated_at: null,
      })
      expect(result.health.error).not.toContain('secret')
    },
  )
  it('fails closed without a usable fallback and rejects mismatched health', async () => {
    const result = await ingestEONET(
      stub(() => new Response('{}')),
      now,
    )
    expect(result.health.status).toBe('failed')
    expect(result.snapshot).toBeNull()
    const valid = await ingestEONET(stub(ok), now)
    expect(() =>
      decodeEONET(
        JSON.stringify({
          ...valid,
          health: { ...valid.health, record_count: 0 },
        }),
        now,
      ),
    ).toThrow()
    expect(() =>
      decodeEONET(
        JSON.stringify({
          ...valid,
          health: { ...valid.health, source: 'usgs' },
        }),
        now,
      ),
    ).toThrow()
    expect(() =>
      parseEONET(
        {
          title: 'EONET Events',
          events: [
            { ...eonetFixture(now).events[0], title: '<script>bad</script>' },
          ],
        },
        now,
      ),
    ).toThrow()
  })
})
