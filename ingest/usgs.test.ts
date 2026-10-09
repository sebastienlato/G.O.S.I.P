import { describe, it, expect } from 'vitest'
import recorded from '../tests/fixtures/usgs-recorded.json'
import { ingestUSGS, LIVE_URL } from './usgs'
import { USGS_URL, MAX_BYTES } from '../src/data/usgs'
import { decodePublished } from '../src/data/published'
const now = recorded.metadata.generated + 1000
const ok = () => new Response(JSON.stringify(recorded))
const stub = (fn: (url: string) => Response | Promise<Response>) =>
  ((url: string | URL | Request) =>
    Promise.resolve(fn(String(url)))) as typeof fetch

describe('bounded USGS publication', () => {
  it('normalizes a recorded provider response with matching health', async () => {
    const result = await ingestUSGS(
      stub((url) => {
        expect(url).toBe(USGS_URL)
        return ok()
      }),
      now,
    )
    const decoded = decodePublished(JSON.stringify(result), now)
    expect(result.health).toMatchObject({
      status: 'ok',
      record_count: 2,
      error: null,
    })
    expect(decoded.snapshot?.events.every((e) => !e.is_demo)).toBe(true)
  })
  it.each([
    'malformed',
    'empty',
    'oversize',
    'too-many',
    'network',
    'stale-provider',
  ])('retains last good with original times after %s', async (failure) => {
    const previous = await ingestUSGS(stub(ok), now)
    const calls: string[] = []
    const result = await ingestUSGS(
      stub((url) => {
        calls.push(url)
        if (url === LIVE_URL) return new Response(JSON.stringify(previous))
        if (failure === 'network') throw new Error('secret transport detail')
        if (failure === 'oversize')
          return new Response('x'.repeat(MAX_BYTES + 1))
        if (failure === 'too-many')
          return new Response(
            JSON.stringify({
              ...recorded,
              features: Array(2001).fill(recorded.features[0]),
            }),
          )
        if (failure === 'empty')
          return new Response(
            JSON.stringify({
              ...recorded,
              metadata: { ...recorded.metadata, count: 0 },
              features: [],
            }),
          )
        if (failure === 'stale-provider') return ok()
        return new Response('{}')
      }),
      now + 3600_000,
    )
    expect(calls).toEqual([USGS_URL, LIVE_URL])
    expect(result.snapshot).toEqual(previous.snapshot)
    expect(result.health).toMatchObject({
      status: 'stale',
      fetched_at: previous.health.fetched_at,
      generated_at: previous.health.generated_at,
    })
    expect(result.health.error).not.toContain('secret')
  })
  it('publishes failure explicitly when no validated last good exists', async () => {
    const result = await ingestUSGS(
      stub(() => new Response('{}')),
      now,
    )
    expect(result.snapshot).toBeNull()
    expect(result.health).toMatchObject({
      status: 'failed',
      record_count: 0,
      fetched_at: null,
    })
    expect(decodePublished(JSON.stringify(result), now).snapshot).toBeNull()
  })
  it('rejects modified health and untrusted normalized records', async () => {
    const result = await ingestUSGS(stub(ok), now)
    expect(() =>
      decodePublished(
        JSON.stringify({
          ...result,
          health: { ...result.health, record_count: 4 },
        }),
        now,
      ),
    ).toThrow()
    result.snapshot.feed.features[0].properties.url = 'https://evil.example/'
    expect(() => decodePublished(JSON.stringify(result), now)).toThrow()
  })
})
