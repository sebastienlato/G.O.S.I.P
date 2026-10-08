import { useEffect, useState } from 'react'
import {
  createWeatherProvider,
  weatherIsStale,
  type WeatherSnapshot,
} from '../data/weather'

const provider = createWeatherProvider()
export function useWeather(active: boolean) {
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [now, setNow] = useState(Date.now)
  const [offline, setOffline] = useState(!navigator.onLine)
  async function refresh() {
    if (!navigator.onLine || document.visibilityState === 'hidden') {
      setError(
        'Refresh paused while offline or hidden. Refresh manually when ready.',
      )
      setAttempted(true)
      return
    }
    if (loading || Date.now() < provider.retryAt) return
    setAttempted(true)
    setLoading(true)
    try {
      setSnapshot(await provider.load())
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'NWS unavailable.')
    } finally {
      setLoading(false)
      setNow(Date.now())
    }
  }
  useEffect(() => {
    if (active && !attempted) void refresh()
  })
  useEffect(() => {
    if (!active) return
    const tick = () => {
      setNow(Date.now())
      setOffline(!navigator.onLine)
    }
    tick()
    const interval = window.setInterval(tick, 1000)
    window.addEventListener('online', tick)
    window.addEventListener('offline', tick)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', tick)
      window.removeEventListener('offline', tick)
    }
  }, [active])
  return {
    snapshot,
    loading,
    error,
    refresh,
    now,
    offline,
    waitSeconds: Math.max(0, Math.ceil((provider.retryAt - now) / 1000)),
    stale: Boolean(snapshot && (error || weatherIsStale(snapshot, now))),
  }
}
