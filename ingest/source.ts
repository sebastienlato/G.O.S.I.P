import {
  readBounded,
  type SourceHealth,
  type PublishedSnapshot,
} from '../src/data/published'
export interface SnapshotBase {
  retrieved_at: string
  generated_at: string | null
  events: readonly unknown[]
}
export interface IngestionAdapter<T extends SnapshotBase> {
  source: SourceHealth['source']
  url: string
  publicationMaxBytes?: number
  maxBytes: number
  readResponse?: (response: Response, now: number) => Promise<unknown>
  decodeResponse?: (raw: string) => unknown
  parse: (raw: unknown, now: number) => T
  validate: (snapshot: T, now: number) => void
  publish: (snapshot: T | null, health: SourceHealth) => PublishedSnapshot
  decode: (
    raw: string,
    now: number,
  ) => { snapshot: T | null; health: SourceHealth }
}
export async function ingestSource<T extends SnapshotBase>(
  adapter: IngestionAdapter<T>,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  async function get(url: string) {
    return readBounded(
      await fetcher(url, {
        signal: AbortSignal.timeout(12_000),
        redirect: 'error',
        cache: 'no-cache',
        headers: {
          'User-Agent':
            'GOSIP/1.0 (+https://github.com/sebastienlato/G.O.S.I.P)',
        },
      }),
      adapter.maxBytes,
    )
  }
  let snapshot: T | null = null
  let error: string | null = null
  let stage = 'request'
  try {
    const raw = adapter.readResponse
      ? await adapter.readResponse(
          await fetcher(adapter.url, {
            signal: AbortSignal.timeout(12_000),
            redirect: 'error',
            cache: 'no-cache',
            headers: {
              'User-Agent':
                'GOSIP/1.0 (+https://github.com/sebastienlato/G.O.S.I.P)',
            },
          }),
          now,
        )
      : (adapter.decodeResponse ?? JSON.parse)(await get(adapter.url))
    stage = 'parse'
    snapshot = adapter.parse(raw, now)
    stage = 'validation'
    adapter.validate(snapshot, now)
    if (
      new TextEncoder().encode(
        JSON.stringify(adapter.publish(snapshot, {} as SourceHealth)),
      ).byteLength >
      (adapter.publicationMaxBytes ?? adapter.maxBytes) - 1000
    )
      throw Error('Publication too large')
  } catch (failure) {
    snapshot = null
    // Never echo arbitrary exceptions: fetch errors can contain secret-bearing URLs.
    const allowed = [
      'Unknown CSV schema',
      'Unexpected FIRMS response',
      'Invalid observation',
      'Invalid measure',
      'Duplicate detection',
      'Too many rows',
      'Invalid fire summary',
      'Insufficient delay',
      'Too many detections',
      'Publication too large',
      'Response too large',
      'HTTP 401',
      'HTTP 403',
      'HTTP 404',
      'HTTP 429',
      'HTTP 500',
      'HTTP 502',
      'HTTP 503',
      'HTTP 504',
    ]
    const detail =
      failure instanceof Error && allowed.includes(failure.message)
        ? failure.message
        : 'unavailable or invalid data'
    error = `${adapter.source.toUpperCase()} ${stage} failed: ${detail}.`
    try {
      snapshot = adapter.decode(
        await get(
          `https://sebastienlato.github.io/G.O.S.I.P/data/${adapter.source}.json`,
        ),
        now,
      ).snapshot
    } catch {
      /* No usable last-good publication. */
    }
  }
  const health: SourceHealth = {
    source: adapter.source,
    attempted_at: new Date(now).toISOString(),
    fetched_at: snapshot?.retrieved_at ?? null,
    generated_at: snapshot?.generated_at ?? null,
    record_count: snapshot?.events.length ?? 0,
    status: error ? (snapshot ? 'stale' : 'failed') : 'ok',
    error,
  }
  const result = adapter.publish(snapshot, health)
  adapter.decode(JSON.stringify(result), now)
  return result
}
