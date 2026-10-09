import { describe, expect, it, vi } from 'vitest'
import { ingestArchive } from '../../ingest/archive'
import { publish } from './published'
import { parseUSGS } from './usgs'
import { parseEONET, publishEONET } from './eonet'
import { eonetFixture } from '../../tests/fixtures/eonet'
import { feed, quake, TEST_NOW } from '../../tests/fixtures/usgs'
import {
  ARCHIVE_MAX_BYTES,
  archiveSources,
  captureEvents,
  capturedStale,
  DAY,
  decodeArchive,
  pruneCaptures,
  validateCapture,
  type Archive,
  type Capture,
} from './archive'
import { filterEvents } from './events'
import { parseFilters, serializeFilters } from '../state/explorer'
const now = TEST_NOW
const iso = (n = now) => new Date(n).toISOString()
function capture(at = now): Capture {
  const s = parseUSGS(
    feed([quake('test001', { time: at - 3600000, updated: at - 1800000 })], at),
    at,
  )
  const e = parseEONET(eonetFixture(at), at)
  return {
    captured_at: iso(at),
    release: {
      source_commit: 'a'.repeat(40),
      event: 'push',
      run_id: '123',
      built_at: iso(at),
    },
    sources: {
      usgs: publish(s, {
        source: 'usgs',
        status: 'ok',
        error: null,
        attempted_at: iso(at),
        fetched_at: iso(at),
        generated_at: iso(at),
        record_count: 1,
      }),
      eonet: publishEONET(e, {
        source: 'eonet',
        status: 'ok',
        error: null,
        attempted_at: iso(at),
        fetched_at: iso(at),
        generated_at: null,
        record_count: e.events.length,
      }),
    },
  }
}
function archive(captures = [capture()]): Archive {
  return {
    version: 1,
    attempted_at: iso(),
    continuity_since: captures[0]?.captured_at ?? iso(),
    status: 'ok',
    error: null,
    captures,
  }
}
function transport(previous: Archive | null, next = capture(), bad = '') {
  return vi.fn(async (url: string | URL | Request) => {
    const path = String(url).split('/G.O.S.I.P/')[1]
    if (path === bad) return new Response('unavailable', { status: 503 })
    if (path === 'data/history.json')
      return new Response(previous ? JSON.stringify(previous) : '', {
        status: previous ? 200 : 404,
      })
    if (path === 'release.json') return Response.json(next.release)
    if (path === 'data/health.json')
      return Response.json({
        version: 1,
        sources: Object.values(next.sources).map((p) => p?.health),
      })
    const key = path?.match(/^data\/(usgs|eonet).json$/)?.[1] as
      'usgs' | 'eonet'
    if (key) return Response.json(next.sources[key])
    throw Error('Unexpected request')
  }) as unknown as typeof fetch
}
describe('bounded published history', () => {
  it('bootstraps only from published data, original times and traceable release', async () => {
    const a = await ingestArchive(transport(null), () => now)
    expect(a.captures).toEqual([capture()])
    expect(a.error).toBe('continuity-unavailable')
    expect(decodeArchive(JSON.stringify(a), now)).toEqual(a)
    const events = captureEvents(a.captures[0], archiveSources)
    expect(events.every((e) => !e.is_demo)).toBe(true)
    expect(events[0].collected_at).toBe(iso())
    expect('occurred_at' in events[0] && events[0].occurred_at).toBe(
      iso(now - 3600000),
    )
  })
  it('preserves the first daily capture even if a later source corrects the magnitude', async () => {
    const old = archive()
    const newer = capture(now + 3600000)
    const fetcher = transport(old, newer)
    const a = await ingestArchive(fetcher, () => now + 3600000)
    expect(a.captures).toEqual(old.captures)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('prunes expired captures and bounds the daily count without backfill', async () => {
    const old = archive(
      Array.from({ length: 7 }, (_, i) => capture(now - (7 - i) * DAY)),
    )
    const a = await ingestArchive(transport(old), () => now)
    expect(a.captures).toHaveLength(7)
    expect(a.captures[0].captured_at).toBe(iso(now - 6 * DAY))
    expect(pruneCaptures(a.captures, now + 8 * DAY)).toEqual([])
  })
  it('retains original capture, source times and failure health after capture failure', async () => {
    const old = archive([capture(now - DAY)])
    old.captures[0].sources.usgs!.health.status = 'stale'
    old.captures[0].sources.usgs!.health.error = 'Retained after failure'
    const a = await ingestArchive(
      transport(old, capture(), 'release.json'),
      () => now,
    )
    expect(a.captures).toEqual(old.captures)
    expect(a.status).toBe('degraded')
    expect(a.error).toBe('capture-unavailable')
    expect(capturedStale(a.captures[0], 'usgs')).toBe(true)
  })
  it('missing source stays missing with independent available records', async () => {
    const a = await ingestArchive(
      transport(null, capture(), 'data/eonet.json'),
      () => now,
    )
    expect(a.captures[0].sources.eonet).toBeNull()
    expect(captureEvents(a.captures[0], ['eonet'])).toEqual([])
    expect(captureEvents(a.captures[0], ['usgs'])).toHaveLength(1)
    expect(captureEvents(a.captures[0], ['news', 'firms'])).toEqual([])
  })
  it('does not publish an empty capture when both sources fail', async () => {
    const f = transport(null)
    const a = await ingestArchive(
      async (url, init) =>
        String(url).match(/data\/(usgs|eonet).json/)
          ? new Response('', { status: 503 })
          : f(url, init),
      () => now,
    )
    expect(a.captures).toEqual([])
    expect(a.status).toBe('degraded')
  })
  it('rejects mixed deployments and mismatching source mirrors', async () => {
    const f = transport(null)
    let releases = 0
    const a = await ingestArchive(
      async (url, init) => {
        if (String(url).endsWith('release.json') && releases++ > 0)
          return Response.json({ ...capture().release, run_id: '124' })
        return f(url, init)
      },
      () => now,
    )
    expect(a.captures).toEqual([])
    const b = await ingestArchive(
      async (url, init) =>
        String(url).endsWith('health.json')
          ? Response.json({ sources: [] })
          : f(url, init),
      () => now,
    )
    expect(b.captures).toEqual([])
  })
  it('rejects oversized, duplicate, future and unknown archive envelopes', () => {
    expect(() =>
      decodeArchive(' '.repeat(ARCHIVE_MAX_BYTES + 1), now),
    ).toThrow()
    expect(() =>
      decodeArchive(JSON.stringify(archive([capture(), capture()])), now),
    ).toThrow()
    expect(() =>
      decodeArchive(JSON.stringify(archive(Array(8).fill(capture()))), now),
    ).toThrow()
    expect(() => validateCapture(capture(now + 1), now)).toThrow()
    expect(() =>
      decodeArchive(JSON.stringify({ ...archive(), extra: 'secret' }), now),
    ).toThrow()
    const c = capture()
    c.sources.usgs!.snapshot.extra = 'x'.repeat(500000)
    expect(() => validateCapture(c, now)).toThrow()
    const d = capture()
    d.release.built_at = iso(now - 1)
    expect(() => validateCapture(d, now)).toThrow()
  })
  it('marks a continuity break if prior history cannot be recovered', async () => {
    const a = await ingestArchive(
      transport(archive(), capture(), 'data/history.json'),
      () => now,
    )
    expect(a.error).toBe('continuity-unavailable')
    expect(a.continuity_since).toBe(iso())
    expect(a.captures).toHaveLength(1)
  })
  it('filters original occurrence/geometry around capture and keeps no-layer subsets empty', () => {
    const c = capture()
    const events = captureEvents(c, ['usgs'])
    expect(filterEvents(events, 'ocean', ['physical'], 6, now)).toHaveLength(1)
    expect(filterEvents(events, 'absent', ['physical'], 6, now)).toEqual([])
    expect(filterEvents(events, '', ['civic'], 6, now)).toEqual([])
    expect(filterEvents(events, '', ['physical'], 6, now + DAY)).toEqual([])
    expect(captureEvents(c, [])).toEqual([])
  })
  it('preserves saved subsets and rejects history for simulations and malformed dates', () => {
    const f = parseFilters('?history=latest&live=&hours=168&q=one')
    expect(f.history).toBe('latest')
    expect(f.liveLayers).toEqual([])
    expect(parseFilters(serializeFilters(f))).toEqual(f)
    expect(parseFilters('?history=2026-02-31T00:00:00.000Z').history).toBe('')
    expect(parseFilters('?source=demo&history=latest').history).toBe('')
  })
})
