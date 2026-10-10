import { cadence, dueSource } from '../src/data/cadence'
import { readBounded, type SourceHealth } from '../src/data/published'
import { decodeRelease } from '../src/data/archive'
const base = 'https://sebastienlato.github.io/G.O.S.I.P/'
export async function publicationDue(
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  const get = async (path: string, cap: number) =>
    JSON.parse(
      await readBounded(
        await fetcher(base + path, {
          redirect: 'error',
          cache: 'no-cache',
          signal: AbortSignal.timeout(12_000),
        }),
        cap,
      ),
    )
  // Unknown publication state stops automatic provider requests, avoiding duplicate storms.
  const release = decodeRelease(await get('release.json', 2000), now)
  const health = await get('data/health.json', 20_000)
  if (
    health.version !== 1 ||
    !Array.isArray(health.sources) ||
    health.sources.length !== 8
  )
    throw Error('Invalid health index')
  for (const source of Object.keys(cadence)) {
    const rows = health.sources.filter((h: SourceHealth) => h.source === source)
    if (
      rows.length !== 1 ||
      !['ok', 'stale', 'failed'].includes(rows[0].status) ||
      !Number.isFinite(Date.parse(rows[0].attempted_at)) ||
      Date.parse(rows[0].attempted_at) > now
    )
      throw Error('Invalid source attempt')
  }
  return (
    now - Date.parse(release.built_at) >= 15 * 60_000 &&
    health.sources.some((h: SourceHealth) => dueSource(h, now))
  )
}
