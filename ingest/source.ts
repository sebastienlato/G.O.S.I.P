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
  maxBytes: number
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
  try {
    snapshot = adapter.parse(JSON.parse(await get(adapter.url)), now)
    adapter.validate(snapshot, now)
    if (
      new TextEncoder().encode(
        JSON.stringify(adapter.publish(snapshot, {} as SourceHealth)),
      ).byteLength >
      adapter.maxBytes - 1000
    )
      throw Error('Publication too large')
  } catch {
    snapshot = null
    error = `${adapter.source.toUpperCase()} fetch failed or returned invalid, oversized, truncated or stale data.`
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
