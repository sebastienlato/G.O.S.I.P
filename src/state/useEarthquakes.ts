import { decodeLaunches, LAUNCH_MAX_BYTES } from '../data/launches'
import { decodeOoni, OONI_MAX_BYTES } from '../data/ooni'
import { decodeNews, NEWS_MAX_BYTES } from '../data/news'
import { decodeFIRMS, FIRMS_MAX_BYTES } from '../data/firms'
import { decodeDWD, DWD_MAX_BYTES } from '../data/dwd'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  decodePublished,
  readBounded,
  LIVE_STALE_MS,
  type SourceHealth,
} from '../data/published'
import type { EarthquakeSnapshot } from '../data/usgs'
import { decodeEONET, EONET_MAX_BYTES } from '../data/eonet'
import { MAX_BYTES } from '../data/usgs'
import { assetPath } from './assetPath'

interface Snapshot {
  events: readonly unknown[]
  generated_at: string | null
  retrieved_at: string
}
export function usePublished<T extends Snapshot>(
  enabled: boolean,
  source: SourceHealth['source'],
  decode: (
    raw: string,
    now: number,
  ) => { snapshot: T | null; health: SourceHealth },
  limit: number,
) {
  const [snapshot, setSnapshot] = useState<T | null>(null)
  const [health, setHealth] = useState<SourceHealth | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(Date.now)
  const pending = useRef(false)
  const retryAt = useRef(0)
  const refresh = useCallback(async () => {
    if (
      pending.current ||
      Date.now() < retryAt.current ||
      !navigator.onLine ||
      document.visibilityState === 'hidden'
    )
      return
    pending.current = true
    retryAt.current = Date.now() + 60_000
    setLoading(true)
    try {
      const raw = await readBounded(
        await fetch(assetPath(`/data/${source}.json`), {
          signal: AbortSignal.timeout(12_000),
          cache: 'no-cache',
          credentials: 'omit',
          redirect: 'error',
        }),
        limit,
      )
      const next = decode(raw, Date.now())
      setSnapshot((previous) => next.snapshot ?? previous)
      setHealth(next.health)
      setError(next.health.error ?? '')
    } catch {
      setError(
        'Published snapshot unavailable. Previously loaded records are retained.',
      )
    } finally {
      pending.current = false
      setLoading(false)
      setNow(Date.now())
    }
  }, [source, decode, limit])
  useEffect(() => {
    if (enabled) void refresh()
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    const poll = enabled
      ? window.setInterval(() => void refresh(), 15 * 60_000)
      : undefined
    return () => {
      clearInterval(clock)
      clearInterval(poll)
    }
  }, [enabled, refresh])
  return {
    snapshot,
    health,
    loading,
    error,
    now,
    refresh,
    offline: !navigator.onLine,
    waitSeconds: Math.max(0, Math.ceil((retryAt.current - now) / 1000)),
    stale:
      !!snapshot &&
      (!!error ||
        health?.status !== 'ok' ||
        now -
          Math.min(
            Date.parse(snapshot.generated_at ?? snapshot.retrieved_at),
            Date.parse(snapshot.retrieved_at),
          ) >
          LIVE_STALE_MS),
  }
}

export function useEarthquakes(enabled: boolean) {
  return usePublished<EarthquakeSnapshot>(
    enabled,
    'usgs',
    decodePublished,
    MAX_BYTES,
  )
}
export function useHazards(enabled: boolean) {
  return usePublished(enabled, 'eonet', decodeEONET, EONET_MAX_BYTES)
}

export function useWarnings(enabled: boolean) {
  return usePublished(enabled, 'dwd', decodeDWD, DWD_MAX_BYTES)
}

export function useFire(enabled: boolean) {
  return usePublished(enabled, 'firms', decodeFIRMS, FIRMS_MAX_BYTES)
}

export function useNews(enabled: boolean) {
  return usePublished(enabled, 'news', decodeNews, NEWS_MAX_BYTES)
}

export function useOoni(enabled: boolean) {
  return usePublished(enabled, 'ooni', decodeOoni, OONI_MAX_BYTES)
}

export function useLaunches(enabled: boolean) {
  return usePublished(enabled, 'launches', decodeLaunches, LAUNCH_MAX_BYTES)
}
