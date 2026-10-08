import type { EarthquakeEvent } from './events'

export const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson'
export const REFRESH_MS = 60_000
export const STALE_MS = 15 * 60_000
export const MAX_BYTES = 2_000_000
export const MAX_RECORDS = 2000
export const COVERAGE =
  'USGS/ANSS M2.5+ past-week feed. Coverage and reporting delays vary by region; smaller earthquakes are excluded. An empty area is not evidence of no activity. Estimates may be revised or withdrawn; this is not an impact assessment or an emergency warning.'
export interface EarthquakeSnapshot {
  events: EarthquakeEvent[]
  generated_at: string
  retrieved_at: string
  rejected: number
  excluded: number
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid object')
  return value as Record<string, unknown>
}
function text(value: unknown, limit = 300): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > limit ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    throw new Error('Invalid text')
  return value.trim()
}
function optionalText(value: unknown, limit = 80): string | null {
  return value == null ? null : text(value, limit)
}
function number(value: unknown, min: number, max: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error('Invalid number')
  return value
}
function timestamp(value: unknown, latest: number): string {
  const time = number(value, 0, latest + 300_000)
  if (!Number.isInteger(time)) throw new Error('Invalid timestamp')
  return new Date(time).toISOString()
}
function sourceUrl(value: unknown): string {
  const raw = text(value, 500)
  const url = new URL(raw)
  if (
    url.origin !== 'https://earthquake.usgs.gov' ||
    url.username ||
    url.password ||
    !/^\/earthquakes\/eventpage\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error('Unsafe source URL')
  return url.href
}
export function parseUSGS(
  input: unknown,
  retrievedTime: number,
): EarthquakeSnapshot {
  if (!Number.isFinite(retrievedTime)) throw new Error('Invalid retrieval time')
  const root = record(input)
  const metadata = record(root.metadata)
  if (
    root.type !== 'FeatureCollection' ||
    metadata.status !== 200 ||
    !Array.isArray(root.features) ||
    root.features.length > MAX_RECORDS ||
    metadata.count !== root.features.length
  )
    throw new Error('Invalid or oversized feed')
  const generated_at = timestamp(metadata.generated, retrievedTime)
  const retrieved_at = new Date(retrievedTime).toISOString()
  const events: EarthquakeEvent[] = []
  const ids = new Set<string>()
  let rejected = 0
  let excluded = 0
  for (const raw of root.features) {
    try {
      const feature = record(raw)
      const p = record(feature.properties)
      if (feature.type !== 'Feature') throw new Error('Invalid feature')
      // Quarry blasts and other event types are not earthquake observations.
      if (text(p.type, 80) !== 'earthquake') {
        excluded++
        continue
      }
      const id = text(feature.id, 100)
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || ids.has(id))
        throw new Error('Invalid or duplicate ID')
      const geometry = record(feature.geometry)
      if (
        geometry.type !== 'Point' ||
        !Array.isArray(geometry.coordinates) ||
        geometry.coordinates.length !== 3
      )
        throw new Error('Invalid geometry')
      const [lon, lat, depth] = geometry.coordinates
      const coordinates: [number, number] = [
        number(lon, -180, 180),
        number(lat, -90, 90),
      ]
      const occurred_at = timestamp(p.time, Date.parse(generated_at))
      const updated_at =
        p.updated == null
          ? null
          : timestamp(p.updated, Date.parse(generated_at))
      if (updated_at && Date.parse(updated_at) < Date.parse(occurred_at))
        throw new Error('Invalid time order')
      const magnitude = p.mag == null ? null : number(p.mag, -5, 12)
      const region = optionalText(p.place, 300)
      const event: EarthquakeEvent = {
        id: `usgs-${id}`,
        provider_id: id,
        category: 'physical',
        title: `${magnitude == null ? 'Magnitude unavailable' : `M ${magnitude}`} · ${region ?? 'Location description unavailable'}`,
        summary:
          'Earthquake source parameters reported by USGS/ANSS. Magnitude describes estimated earthquake size, not local shaking or damage. Depth is the estimated hypocentral depth in kilometres relative to the provider’s reference surface; negative depths are possible.',
        region: region ?? 'Location description unavailable',
        country: '',
        coordinates,
        occurred_at,
        updated_at,
        collected_at: retrieved_at,
        feed_generated_at: generated_at,
        source_name: 'U.S. Geological Survey / ANSS',
        source_url: sourceUrl(p.url),
        network: optionalText(p.net),
        provider_code: optionalText(p.code),
        magnitude,
        magnitude_type: optionalText(p.magType),
        depth_km: depth == null ? null : number(depth, -100, 1000),
        status: optionalText(p.status),
        is_demo: false,
        freshness: 'retrieved',
        coverage_note: COVERAGE,
      }
      ids.add(id)
      events.push(event)
    } catch {
      rejected++
    }
  }
  if (rejected && events.length === 0)
    throw new Error('No valid earthquake records in the response')
  return { events, generated_at, retrieved_at, rejected, excluded }
}
export function snapshotIsStale(
  snapshot: EarthquakeSnapshot,
  now: number,
): boolean {
  return (
    now -
      Math.min(
        Date.parse(snapshot.generated_at),
        Date.parse(snapshot.retrieved_at),
      ) >
    STALE_MS
  )
}

// One bounded request, shared across React remounts. No polling or persistent storage.
export function createUSGSProvider(
  fetcher: typeof fetch = fetch,
  now = Date.now,
) {
  let pending: Promise<EarthquakeSnapshot> | null = null
  let retryAt = 0
  return {
    get retryAt() {
      return retryAt
    },
    load(): Promise<EarthquakeSnapshot> {
      if (pending) return pending
      if (now() < retryAt)
        return Promise.reject(new Error('Please wait before refreshing USGS.'))
      retryAt = now() + REFRESH_MS
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12_000)
      pending = (async () => {
        try {
          const response = await fetcher(USGS_URL, {
            signal: controller.signal,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            redirect: 'error',
          })
          if (!response.ok) {
            // Respect Retry-After when CORS exposes it; otherwise back off 5 minutes for 429.
            const header = response.headers.get('Retry-After')
            const delay =
              header && /^\d+$/.test(header)
                ? Number(header) * 1000
                : header
                  ? Date.parse(header) - now()
                  : 0
            retryAt = Math.max(
              retryAt,
              now() + (response.status === 429 ? 300_000 : REFRESH_MS),
              Number.isFinite(delay) ? now() + delay : 0,
            )
            throw new Error(`USGS request failed (HTTP ${response.status}).`)
          }
          if (Number(response.headers.get('Content-Length')) > MAX_BYTES)
            throw new Error('USGS response exceeds the size limit.')
          const reader = response.body?.getReader()
          if (!reader) throw new Error('USGS response body is unavailable.')
          const decoder = new TextDecoder('utf-8', { fatal: true })
          let size = 0
          let body = ''
          try {
            while (true) {
              const chunk = await reader.read()
              if (chunk.done) break
              size += chunk.value.byteLength
              if (size > MAX_BYTES)
                throw new Error('USGS response exceeds the size limit.')
              body += decoder.decode(chunk.value, { stream: true })
            }
            body += decoder.decode()
          } finally {
            await reader.cancel().catch(() => {})
          }
          return parseUSGS(JSON.parse(body), now())
        } catch (error) {
          if (controller.signal.aborted)
            throw new Error('USGS request timed out after 12 seconds.')
          if (error instanceof Error && error.message.startsWith('USGS '))
            throw error
          throw new Error(
            'USGS could not be loaded: network failure or invalid feed. Try again later or explore simulated examples.',
          )
        } finally {
          controller.abort()
          clearTimeout(timeout)
          pending = null
        }
      })()
      return pending
    },
  }
}
export const usgsProvider = createUSGSProvider()
