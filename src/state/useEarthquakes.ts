import { localSourceAccess } from './sourceAccess'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { snapshotIsStale } from '../data/usgs'
import { CACHE_KEY, CADENCE_KEY } from './earthquakeCache'
import { createEarthquakeStore } from './earthquakeStore'

const store = createEarthquakeStore({
  storage: () => window.localStorage,
  locks: navigator.locks,
  canFetch: () =>
    localSourceAccess &&
    navigator.onLine &&
    document.visibilityState !== 'hidden',
})

export function useEarthquakes(enabled: boolean) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const [now, setNow] = useState(Date.now)
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    if (!enabled || !localSourceAccess) return
    store.start()
    // UI clock only. Neither timers nor reconnect/visibility events fetch data.
    const tick = () => {
      store.expire()
      setNow(Date.now())
      setOffline(!navigator.onLine)
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    const sync = (event: StorageEvent) => {
      if (
        event.key === CACHE_KEY ||
        event.key === CADENCE_KEY ||
        event.key === null
      )
        store.sync()
    }
    window.addEventListener('storage', sync)
    window.addEventListener('online', tick)
    window.addEventListener('offline', tick)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('storage', sync)
      window.removeEventListener('online', tick)
      window.removeEventListener('offline', tick)
    }
  }, [enabled])
  return {
    ...state,
    now,
    offline,
    refresh: async () => {
      if (localSourceAccess) await store.refresh()
    },
    clearCache: store.clearCache,
    coordinationLimited: store.coordinationLimited,
    stale:
      !!state.snapshot &&
      (!!state.error || snapshotIsStale(state.snapshot, now)),
    waitSeconds: Math.max(0, Math.ceil((state.retryAt - now) / 1000)),
  }
}
