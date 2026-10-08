import { describe, expect, it } from 'vitest'
import { feed, quake, TEST_NOW } from '../../tests/fixtures/usgs'
import { MAX_BYTES, parseUSGS } from '../data/usgs'
import {
  CACHE_KEY,
  CACHE_VERSION,
  createEarthquakeCache,
  decodeSnapshot,
  encodeSnapshot,
  RETENTION_MS,
} from './earthquakeCache'

export function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}
describe('bounded earthquake cache', () => {
  const snapshot = parseUSGS(
    feed([
      quake(),
      quake('bad', { mag: 'invalid' }),
      quake('blast', { type: 'quarry blast' }),
    ]),
    TEST_NOW,
  )
  it('round trips parameters, original times and rejection counts without demo data', () => {
    expect(
      decodeSnapshot(encodeSnapshot(snapshot), TEST_NOW + 16 * 60_000),
    ).toEqual(snapshot)
    expect(
      decodeSnapshot(encodeSnapshot(parseUSGS(feed([]), TEST_NOW)), TEST_NOW)
        .events,
    ).toEqual([])
  })
  it.each([
    'version',
    'time',
    'future',
    'url',
    'coordinate',
    'counts',
    'type',
    'duplicate',
  ])('discards corrupt %s records as a whole', (kind) => {
    const value = JSON.parse(encodeSnapshot(snapshot))
    if (kind === 'version') value.version = CACHE_VERSION + 1
    if (kind === 'time') value.retrieved = 'yesterday'
    if (kind === 'future') value.retrieved = TEST_NOW + 600_000
    if (kind === 'url')
      value.feed.features[0].properties.url = 'javascript:alert(1)'
    if (kind === 'coordinate')
      value.feed.features[0].geometry.coordinates[0] = 181
    if (kind === 'counts') value.rejected = 2001
    if (kind === 'type') value.feed.features[0].properties.type = 'simulation'
    if (kind === 'duplicate') {
      value.feed.features.push(value.feed.features[0])
      value.feed.metadata.count++
    }
    expect(() => decodeSnapshot(JSON.stringify(value), TEST_NOW)).toThrow()
  })
  it('expires at 24 hours, checks generation age, bounds bytes and removes invalid saved data', () => {
    expect(() =>
      decodeSnapshot(encodeSnapshot(snapshot), TEST_NOW + RETENTION_MS),
    ).toThrow()
    expect(() =>
      decodeSnapshot(
        encodeSnapshot(parseUSGS(feed([], TEST_NOW - RETENTION_MS), TEST_NOW)),
        TEST_NOW,
      ),
    ).toThrow()
    expect(() => decodeSnapshot('x'.repeat(MAX_BYTES + 1), TEST_NOW)).toThrow()
    const storage = memoryStorage()
    storage.setItem(CACHE_KEY, '{broken')
    const cache = createEarthquakeCache(
      () => storage,
      () => TEST_NOW,
    )
    expect(cache.read()).toBeNull()
    expect(storage.getItem(CACHE_KEY)).toBeNull()
    expect(cache.notice).toContain('discarded')
  })
  it('clears only the snapshot and preserves request cooldown', () => {
    const storage = memoryStorage()
    const cache = createEarthquakeCache(
      () => storage,
      () => TEST_NOW,
    )
    cache.save(snapshot)
    cache.saveCadence({ retryAt: TEST_NOW + 900_000, error: 'HTTP 429' })
    expect(cache.clear()).toBe(true)
    expect(cache.read()).toBeNull()
    expect(cache.readCadence()).toEqual({
      retryAt: TEST_NOW + 900_000,
      error: 'HTTP 429',
    })
  })
  it('handles denied reads/writes and full storage without throwing', () => {
    const denied = createEarthquakeCache(() => {
      throw new Error('denied')
    })
    expect(denied.read()).toBeNull()
    expect(denied.save(snapshot)).toBe(false)
    expect(denied.clear()).toBe(false)
    expect(denied.notice).toContain('unavailable')
    const storage = memoryStorage()
    storage.setItem(CACHE_KEY, encodeSnapshot(snapshot))
    const full = createEarthquakeCache(
      () => ({
        ...storage,
        setItem: () => {
          throw new Error('full')
        },
      }),
      () => TEST_NOW,
    )
    expect(full.save(snapshot)).toBe(false)
    expect(storage.getItem(CACHE_KEY)).toBeNull()
  })
})
