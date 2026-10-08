import { expect, it, vi } from 'vitest'
import { feed, TEST_NOW } from '../../tests/fixtures/usgs'
import { createUSGSProvider } from '../data/usgs'
import { createEarthquakeStore } from './earthquakeStore'

function setup() {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
  let time = TEST_NOW
  const now = () => time
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response(JSON.stringify(feed())))
  const create = (canFetch = () => true) =>
    createEarthquakeStore({
      storage: () => storage,
      now,
      provider: createUSGSProvider(fetcher, now),
      canFetch,
    })
  return {
    create,
    fetcher,
    advance: (ms: number) => {
      time += ms
    },
  }
}
it('restores without fetching and respects cooldown after reload and cache clear', async () => {
  const { create, fetcher, advance } = setup()
  const first = create()
  first.start()
  await first.refresh()
  const reloaded = create()
  reloaded.start()
  expect(reloaded.getSnapshot()).toMatchObject({ cached: true, saved: true })
  expect(fetcher).toHaveBeenCalledTimes(1)
  reloaded.clearCache()
  await reloaded.refresh()
  expect(fetcher).toHaveBeenCalledTimes(1)
  advance(61_000)
  await reloaded.refresh()
  expect(fetcher).toHaveBeenCalledTimes(2)
})
it('persists Retry-After and failure staleness across reload; success replaces data', async () => {
  const { create, fetcher, advance } = setup()
  const store = create()
  await store.refresh()
  advance(61_000)
  fetcher.mockResolvedValueOnce(
    new Response('', { status: 429, headers: { 'Retry-After': '900' } }),
  )
  await store.refresh()
  expect(store.getSnapshot().snapshot?.events).toHaveLength(1)
  const reloaded = create()
  reloaded.start()
  expect(reloaded.getSnapshot()).toMatchObject({
    cached: true,
    error: 'USGS request failed (HTTP 429).',
    retryAt: TEST_NOW + 961_000,
  })
  await reloaded.refresh()
  expect(fetcher).toHaveBeenCalledTimes(2)
  advance(900_000)
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify(feed([]))))
  await reloaded.refresh()
  expect(reloaded.getSnapshot()).toMatchObject({
    cached: false,
    error: '',
    snapshot: { events: [] },
  })
})
it('does not request while offline/hidden and only retries on explicit action', async () => {
  const { create, fetcher } = setup()
  let allowed = false
  const store = create(() => allowed)
  store.start()
  await store.refresh()
  expect(fetcher).not.toHaveBeenCalled()
  expect(store.getSnapshot().error).toContain('paused')
  allowed = true
  expect(fetcher).not.toHaveBeenCalled()
  await store.refresh()
  expect(fetcher).toHaveBeenCalledTimes(1)
})

it('retains the visible snapshot while a shared refresh is pending', async () => {
  const { create, fetcher, advance } = setup()
  const store = create()
  await store.refresh()
  advance(61_000)
  let resolve!: (response: Response) => void
  fetcher.mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done
      }),
  )
  const pending = store.refresh()
  expect(store.refresh()).toBe(pending)
  expect(store.getSnapshot()).toMatchObject({
    loading: true,
    snapshot: { events: [{ provider_id: 'test001' }] },
  })
  resolve(new Response(JSON.stringify(feed([]))))
  await pending
  expect(store.getSnapshot()).toMatchObject({
    loading: false,
    snapshot: { events: [] },
  })
  expect(fetcher).toHaveBeenCalledTimes(2)
})

it('expires the stored copy while retaining explicitly stale in-memory observations', async () => {
  const { create, advance } = setup()
  const store = create()
  await store.refresh()
  advance(24 * 3600_000)
  store.expire()
  expect(store.getSnapshot()).toMatchObject({
    saved: false,
    snapshot: { events: [{ provider_id: 'test001' }] },
  })
  expect(store.getSnapshot().storageNote).toContain('expired')
})
