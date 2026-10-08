import { useCallback, useEffect, useRef, useState } from 'react'
import {
  snapshotIsStale,
  usgsProvider,
  type EarthquakeSnapshot,
} from '../data/usgs'

export function useEarthquakes(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<EarthquakeSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now)
  const started = useRef(false)
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setSnapshot(await usgsProvider.load())
      setError('')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'USGS unavailable.')
    } finally {
      setLoading(false)
      setNow(Date.now())
    }
  }, [])
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    if (!started.current) {
      started.current = true
      void refresh()
    }
    // UI clock only: this timer never makes a network request.
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [enabled, refresh])
  return {
    snapshot,
    loading,
    error,
    now,
    refresh,
    stale: !!snapshot && (!!error || snapshotIsStale(snapshot, now)),
    waitSeconds: Math.max(0, Math.ceil((usgsProvider.retryAt - now) / 1000)),
  }
}
