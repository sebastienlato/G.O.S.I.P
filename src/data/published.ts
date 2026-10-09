import { decodeSnapshot, encodeSnapshot } from '../state/earthquakeCache'
import { MAX_BYTES, type EarthquakeSnapshot } from './usgs'

export const LIVE_STALE_MS = 45 * 60_000
export interface SourceHealth {
  source:
    | 'usgs'
    | 'eonet'
    | 'dwd'
    | 'firms'
    | 'news'
    | 'ooni'
    | 'launches'
    | 'maritime'
  attempted_at: string
  fetched_at: string | null
  generated_at: string | null
  record_count: number
  status: 'ok' | 'stale' | 'failed'
  error: string | null
}
export interface PublishedSnapshot {
  version: 1
  health: SourceHealth
  snapshot: ReturnType<typeof JSON.parse> | null
}
export function publish(
  snapshot: EarthquakeSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: snapshot ? JSON.parse(encodeSnapshot(snapshot)) : null,
  }
}
export function decodePublished(raw: string, now: number) {
  if (new TextEncoder().encode(raw).byteLength > MAX_BYTES)
    throw new Error('Snapshot too large')
  const value = JSON.parse(raw) as PublishedSnapshot
  const h = value?.health
  const validTime = (t: unknown) =>
    typeof t === 'string' &&
    Number.isFinite(Date.parse(t)) &&
    new Date(t).toISOString() === t &&
    Date.parse(t) <= now + 300_000
  if (
    value?.version !== 1 ||
    !h ||
    h.source !== 'usgs' ||
    !validTime(h.attempted_at) ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    !(
      h.error === null ||
      (typeof h.error === 'string' && h.error.length <= 300)
    )
  )
    throw new Error('Invalid source health')
  const snapshot =
    value.snapshot === null
      ? null
      : decodeSnapshot(JSON.stringify(value.snapshot), now, Infinity)
  if (snapshot) {
    if (
      !snapshot.events.length ||
      h.status === 'failed' ||
      h.record_count !== snapshot.events.length ||
      h.fetched_at !== snapshot.retrieved_at ||
      h.generated_at !== snapshot.generated_at ||
      Date.parse(h.fetched_at) > Date.parse(h.attempted_at)
    )
      throw new Error('Inconsistent snapshot health')
  } else if (
    h.status !== 'failed' ||
    h.record_count !== 0 ||
    h.fetched_at !== null ||
    h.generated_at !== null
  )
    throw new Error('Missing snapshot')
  if ((h.status === 'ok') !== (h.error === null))
    throw new Error('Inconsistent failure status')
  return { snapshot, health: h }
}

// The same streaming limit applies to the provider and same-origin published data.
export async function readBounded(
  response: Response,
  limit = MAX_BYTES,
): Promise<string> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (Number(response.headers.get('content-length')) > limit)
    throw new Error('Response too large')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Missing response body')
  let size = 0
  let raw = ''
  const decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > limit) throw new Error('Response too large')
      raw += decoder.decode(chunk.value, { stream: true })
    }
    return raw + decoder.decode()
  } finally {
    await reader.cancel().catch(() => {})
  }
}
