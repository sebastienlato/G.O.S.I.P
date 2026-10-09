import { readBounded } from '../src/data/published'
import {
  ARCHIVE_MAX_BYTES,
  ARCHIVE_SOURCE_BYTES,
  archiveSources,
  decodeArchive,
  decodeArchiveSource,
  decodeRelease,
  pruneCaptures,
  validateCapture,
  type Archive,
  type Capture,
} from '../src/data/archive'

const base = 'https://sebastienlato.github.io/G.O.S.I.P/'
export async function ingestArchive(
  fetcher: typeof fetch = fetch,
  clock = Date.now,
): Promise<Archive> {
  async function get(path: string, limit: number) {
    return readBounded(
      await fetcher(base + path, {
        signal: AbortSignal.timeout(12_000),
        cache: 'no-cache',
        redirect: 'error',
        headers: {
          'User-Agent':
            'GOSIP/1.0 (+https://github.com/sebastienlato/G.O.S.I.P)',
        },
      }),
      limit,
    )
  }
  let previous: Archive | null = null
  try {
    previous = decodeArchive(
      await get('data/history.json', ARCHIVE_MAX_BYTES),
      clock(),
    )
  } catch {
    /* Explicit continuity boundary; no invented recovery. */
  }
  let captures = pruneCaptures(previous?.captures ?? [], clock())
  let error: Archive['error'] = previous ? null : 'continuity-unavailable'
  const today = new Date(clock()).toISOString().slice(0, 10)
  if (!captures.some((c) => c.captured_at.startsWith(today))) {
    try {
      const release = decodeRelease(
        JSON.parse(await get('release.json', 2000)),
        clock(),
      )
      const health = JSON.parse(await get('data/health.json', 20_000))
      const sources: Capture['sources'] = { usgs: null, eonet: null }
      await Promise.all(
        archiveSources.map(async (source) => {
          try {
            const p = JSON.parse(
              await get(`data/${source}.json`, ARCHIVE_SOURCE_BYTES),
            )
            decodeArchiveSource(source, p, clock())
            // Mirrors and stable release prevent mixing builds during a deployment/CDN transition.
            const mirror = health.sources.find(
              (h: { source: string }) => h.source === source,
            )
            if (JSON.stringify(mirror) !== JSON.stringify(p.health))
              throw Error('Health mismatch')
            sources[source] = p
          } catch {
            /* A missing source stays missing in this capture. */
          }
        }),
      )
      const after = decodeRelease(
        JSON.parse(await get('release.json', 2000)),
        clock(),
      )
      if (JSON.stringify(release) !== JSON.stringify(after))
        throw Error('Release changed')
      const capture = validateCapture(
        { captured_at: new Date(clock()).toISOString(), release, sources },
        clock(),
      )
      captures.push(capture)
    } catch {
      error = 'capture-unavailable'
    }
  }
  const now = clock()
  captures = pruneCaptures(captures, now)
  const archive: Archive = {
    version: 1,
    attempted_at: new Date(now).toISOString(),
    status: error ? 'degraded' : 'ok',
    error,
    continuity_since:
      previous?.continuity_since ??
      captures[0]?.captured_at ??
      new Date(now).toISOString(),
    captures,
  }
  return decodeArchive(JSON.stringify(archive), now)
}
