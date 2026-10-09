import { parseUSGS, USGS_URL, MAX_BYTES } from '../src/data/usgs'
import {
  decodePublished,
  publish,
  readBounded,
  LIVE_STALE_MS,
  type SourceHealth,
} from '../src/data/published'

export const LIVE_URL =
  'https://sebastienlato.github.io/G.O.S.I.P/data/usgs.json'
export async function ingestUSGS(
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  async function get(url: string) {
    return readBounded(
      await fetcher(url, {
        signal: AbortSignal.timeout(12_000),
        redirect: 'error',
        headers: {
          'User-Agent':
            'GOSIP/1.0 (+https://github.com/sebastienlato/G.O.S.I.P)',
        },
      }),
    )
  }
  let snapshot = null
  let error: string | null = null
  try {
    snapshot = parseUSGS(JSON.parse(await get(USGS_URL)), now)
    if (!snapshot.events.length) throw new Error('Empty response')
    if (now - Date.parse(snapshot.generated_at) > LIVE_STALE_MS)
      throw new Error('Provider feed is stale')
    if (
      new TextEncoder().encode(
        JSON.stringify(publish(snapshot, {} as SourceHealth)),
      ).byteLength >
      MAX_BYTES - 1000
    )
      throw new Error('Normalized response too large')
  } catch {
    snapshot = null
    error =
      'USGS fetch failed or returned invalid, empty, oversized or stale data.'
    try {
      snapshot = decodePublished(await get(LIVE_URL), now).snapshot
    } catch {
      /* First deployment or unavailable last-good copy. */
    }
  }
  const health: SourceHealth = {
    source: 'usgs',
    attempted_at: new Date(now).toISOString(),
    fetched_at: snapshot?.retrieved_at ?? null,
    generated_at: snapshot?.generated_at ?? null,
    record_count: snapshot?.events.length ?? 0,
    status: error ? (snapshot ? 'stale' : 'failed') : 'ok',
    error,
  }
  const result = publish(snapshot, health)
  decodePublished(JSON.stringify(result), now)
  return result
}
