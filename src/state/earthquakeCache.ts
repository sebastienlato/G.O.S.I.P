import {
  MAX_BYTES,
  MAX_RECORDS,
  parseUSGS,
  type EarthquakeSnapshot,
} from '../data/usgs'

export const CACHE_KEY = 'gosip.usgs.snapshot.v1'
export const CADENCE_KEY = 'gosip.usgs.cadence.v1'
export const RETENTION_MS = 24 * 3600_000
export const CACHE_VERSION = 1
export type StorageAccess = () => Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>
export type Cadence = { retryAt: number; error: string }

// Store only the parameters we display. Rebuild derived text with the same
// provider parser on every restore; cached strings never bypass validation.
export function encodeSnapshot(snapshot: EarthquakeSnapshot): string {
  return JSON.stringify({
    version: CACHE_VERSION,
    retrieved: Date.parse(snapshot.retrieved_at),
    rejected: snapshot.rejected,
    excluded: snapshot.excluded,
    feed: {
      type: 'FeatureCollection',
      metadata: {
        status: 200,
        count: snapshot.events.length,
        generated: Date.parse(snapshot.generated_at),
      },
      features: snapshot.events.map((e) => ({
        type: 'Feature',
        id: e.provider_id,
        geometry: {
          type: 'Point',
          coordinates: [...e.coordinates, e.depth_km],
        },
        properties: {
          type: 'earthquake',
          place: e.region,
          time: Date.parse(e.occurred_at),
          updated: e.updated_at === null ? null : Date.parse(e.updated_at),
          mag: e.magnitude,
          magType: e.magnitude_type,
          status: e.status,
          net: e.network,
          code: e.provider_code,
          url: e.source_url,
        },
      })),
    },
  })
}
export function decodeSnapshot(raw: string, now: number): EarthquakeSnapshot {
  if (
    raw.length > MAX_BYTES ||
    new TextEncoder().encode(raw).byteLength > MAX_BYTES
  )
    throw new Error('Oversized cache')
  const value = JSON.parse(raw)
  if (
    !value ||
    value.version !== CACHE_VERSION ||
    !Number.isSafeInteger(value.retrieved) ||
    value.retrieved < 0 ||
    value.retrieved > now + 300_000 ||
    now - value.retrieved >= RETENTION_MS ||
    !Number.isInteger(value.rejected) ||
    value.rejected < 0 ||
    !Number.isInteger(value.excluded) ||
    value.excluded < 0
  )
    throw new Error('Invalid or expired cache')
  const snapshot = parseUSGS(value.feed, value.retrieved)
  if (
    snapshot.rejected ||
    snapshot.excluded ||
    snapshot.events.length + value.rejected + value.excluded > MAX_RECORDS ||
    now - Date.parse(snapshot.generated_at) >= RETENTION_MS
  )
    throw new Error('Invalid or expired cached records')
  return { ...snapshot, rejected: value.rejected, excluded: value.excluded }
}

export function createEarthquakeCache(access: StorageAccess, now = Date.now) {
  let notice = ''
  const unavailable = () => {
    notice =
      'Device storage unavailable or full. Data and cooldowns are kept in this page only; reload and tab coordination may be limited.'
  }
  function remove(key: string) {
    try {
      access().removeItem(key)
      return true
    } catch {
      unavailable()
      return false
    }
  }
  return {
    get notice() {
      return notice
    },
    read(): EarthquakeSnapshot | null {
      let raw: string | null
      try {
        raw = access().getItem(CACHE_KEY)
      } catch {
        unavailable()
        return null
      }
      if (!raw) return null
      try {
        return decodeSnapshot(raw, now())
      } catch {
        notice = 'Saved snapshot was expired or invalid and has been discarded.'
        remove(CACHE_KEY)
        return null
      }
    },
    save(snapshot: EarthquakeSnapshot): boolean {
      try {
        const raw = encodeSnapshot(snapshot)
        decodeSnapshot(raw, now())
        access().setItem(CACHE_KEY, raw)
        notice = ''
        return true
      } catch {
        // An older saved snapshot must not supersede a newer response on reload.
        remove(CACHE_KEY)
        notice =
          'Snapshot could not be saved (storage unavailable, full, or data outside cache limits). Current observations remain in memory.'
        return false
      }
    },
    clear() {
      const removed = remove(CACHE_KEY)
      if (removed)
        notice =
          'Saved snapshot cleared. Current observations stay in memory; a successful refresh saves a new copy. Request cooldown is retained.'
      return removed
    },
    readCadence(): Cadence {
      try {
        const raw = access().getItem(CADENCE_KEY)
        if (!raw) return { retryAt: 0, error: '' }
        if (raw.length > 2000) throw new Error('Oversized cooldown')
        const value = JSON.parse(raw)
        if (
          value.version !== CACHE_VERSION ||
          !Number.isSafeInteger(value.retryAt) ||
          value.retryAt < 0 ||
          typeof value.error !== 'string' ||
          value.error.length > 500
        )
          throw new Error('Invalid cooldown')
        return { retryAt: value.retryAt, error: value.error }
      } catch {
        unavailable()
        return { retryAt: 0, error: '' }
      }
    },
    saveCadence(cadence: Cadence) {
      try {
        access().setItem(
          CADENCE_KEY,
          JSON.stringify({ version: CACHE_VERSION, ...cadence }),
        )
      } catch {
        unavailable()
      }
    },
  }
}
