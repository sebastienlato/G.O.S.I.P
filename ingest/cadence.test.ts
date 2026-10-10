import { afterEach, expect, it, vi } from 'vitest'
import { publicationDue } from './cadence'
import { cadence, staleAfter } from '../src/data/cadence'
import { ingestUSGS, LIVE_URL } from './usgs'
import recorded from '../tests/fixtures/usgs-recorded.json'
const now = recorded.metadata.generated + 1000
const iso = (age: number) => new Date(now - age).toISOString()
const prior = await ingestUSGS(
  vi.fn(async () => Response.json(recorded)),
  now,
)
afterEach(() => vi.unstubAllEnvs())
it('reuses a recent success or failure exactly, including attempt/retrieval times, with no provider call', async () => {
  vi.stubEnv('GOSIP_USE_CADENCE', '1')
  for (const previous of [
    prior,
    {
      ...prior,
      health: {
        ...prior.health,
        status: 'stale',
        error: 'USGS request failed: HTTP 503.',
      },
    },
  ]) {
    const fetcher = vi.fn(async (url) => {
      expect(url).toBe(LIVE_URL)
      return Response.json(previous)
    })
    expect(await ingestUSGS(fetcher, now + 10 * 60_000)).toEqual(previous)
    expect(fetcher).toHaveBeenCalledTimes(1)
  }
})
it('due source makes only one provider attempt and retains prior data on failure', async () => {
  vi.stubEnv('GOSIP_USE_CADENCE', '1')
  const fetcher = vi.fn(async (url) =>
    String(url) === LIVE_URL
      ? Response.json(prior)
      : new Response('', { status: 429 }),
  )
  const result = await ingestUSGS(fetcher, now + 16 * 60_000)
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(result.snapshot).toEqual(prior.snapshot)
  expect(result.health.status).toBe('stale')
  expect(result.health.fetched_at).toBe(prior.health.fetched_at)
})
it('serialized guard requires old publication AND a due source; malformed evidence fails closed', async () => {
  const mock = (age: number, attemptAge: number, bad = false) =>
    vi.fn(async (url) =>
      Response.json(
        String(url).endsWith('release.json')
          ? {
              source_commit: 'a'.repeat(40),
              run_id: '123',
              event: 'schedule',
              built_at: iso(age),
            }
          : {
              version: 1,
              sources: bad
                ? []
                : Object.keys(cadence).map((source) => ({
                    source,
                    status: 'ok',
                    attempted_at: iso(attemptAge),
                  })),
            },
      ),
    )
  expect(await publicationDue(mock(14 * 60_000, 60 * 60_000), now)).toBe(false)
  expect(await publicationDue(mock(16 * 60_000, 5 * 60_000), now)).toBe(false)
  expect(await publicationDue(mock(16 * 60_000, 16 * 60_000), now)).toBe(true)
  await expect(
    publicationDue(mock(16 * 60_000, 16 * 60_000, true), now),
  ).rejects.toThrow()
  expect(staleAfter('maritime')).toBe(750 * 60_000)
  expect(staleAfter('usgs')).toBe(45 * 60_000)
})
