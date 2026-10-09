import { useCallback, useEffect, useRef, useState } from 'react'
import {
  decodePublished,
  readBounded,
  LIVE_STALE_MS,
  type SourceHealth,
} from '../data/published'
import type { EarthquakeSnapshot } from '../data/usgs'
import { assetPath } from './assetPath'

export function useEarthquakes(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<EarthquakeSnapshot | null>(null)
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
        await fetch(assetPath('/data/usgs.json'), {
          signal: AbortSignal.timeout(12_000),
          cache: 'no-cache',
          credentials: 'omit',
          redirect: 'error',
        }),
      )
      const next = decodePublished(raw, Date.now())
      setSnapshot(next.snapshot)
      setHealth(next.health)
      setError(next.health.error ?? '')
    } catch {
      setError(
        'Published snapshot unavailable. Previously loaded observations are retained.',
      )
    } finally {
      pending.current = false
      setLoading(false)
      setNow(Date.now())
    }
  }, [])
  useEffect(() => {
    if (!enabled) return
    void refresh()
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    const poll = window.setInterval(() => void refresh(), 15 * 60_000)
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
            Date.parse(snapshot.generated_at),
            Date.parse(snapshot.retrieved_at),
          ) >
          LIVE_STALE_MS),
  }
}
