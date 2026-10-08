import {
  REFRESH_MS,
  type EarthquakeSnapshot,
  createUSGSProvider,
} from '../data/usgs'
import {
  createEarthquakeCache,
  RETENTION_MS,
  type StorageAccess,
} from './earthquakeCache'

type State = {
  snapshot: EarthquakeSnapshot | null
  loading: boolean
  error: string
  cached: boolean
  saved: boolean
  storageNote: string
  retryAt: number
}
type Options = {
  storage: StorageAccess
  provider?: ReturnType<typeof createUSGSProvider>
  now?: () => number
  locks?: Pick<LockManager, 'request'>
  canFetch?: () => boolean
}
export function createEarthquakeStore({
  storage,
  provider = createUSGSProvider(),
  now = Date.now,
  locks,
  canFetch = () => true,
}: Options) {
  const cache = createEarthquakeCache(storage, now)
  let state: State = {
    snapshot: null,
    loading: false,
    error: '',
    cached: false,
    saved: false,
    storageNote: '',
    retryAt: 0,
  }
  let started = false
  let pending: Promise<void> | null = null
  const listeners = new Set<() => void>()
  function update(patch: Partial<State>) {
    state = { ...state, ...patch, storageNote: cache.notice }
    listeners.forEach((listener) => listener())
  }
  function sync() {
    const snapshot = cache.read()
    const cadence = cache.readCadence()
    update({
      ...(snapshot &&
      (!state.snapshot || snapshot.retrieved_at > state.snapshot.retrieved_at)
        ? { snapshot, cached: true }
        : {}),
      saved: !!snapshot,
      error: cadence.error,
      retryAt: Math.max(state.retryAt, provider.retryAt, cadence.retryAt),
    })
  }
  async function request() {
    const cadence = cache.readCadence()
    const retryAt = Math.max(state.retryAt, provider.retryAt, cadence.retryAt)
    if (now() < retryAt) {
      update({ retryAt, error: cadence.error || state.error })
      return
    }
    if (!canFetch()) {
      update({
        error:
          'Refresh paused while offline or this tab is hidden. Return online and use Refresh / Retry.',
      })
      return
    }
    update({ loading: true, retryAt: now() + REFRESH_MS })
    cache.saveCadence({ retryAt: state.retryAt, error: state.error })
    try {
      const snapshot = await provider.load()
      const saved = cache.save(snapshot)
      update({ snapshot, saved, cached: false, error: '' })
    } catch (error) {
      update({
        error: error instanceof Error ? error.message : 'USGS unavailable.',
      })
    } finally {
      const retryAt = Math.max(state.retryAt, provider.retryAt)
      cache.saveCadence({ retryAt, error: state.error })
      update({ loading: false, retryAt })
    }
  }
  function refresh(): Promise<void> {
    if (pending) return pending
    // ifAvailable never queues a delayed request when another tab is fetching.
    pending = (async () => {
      try {
        if (locks)
          await locks.request(
            'gosip.usgs.refresh',
            { ifAvailable: true },
            async (lock) => {
              if (lock) await request()
              else {
                sync()
                update({
                  error:
                    'Another tab is refreshing USGS. Its result will appear here if device storage is available; no request was queued.',
                })
              }
            },
          )
        else await request()
      } catch {
        update({
          error:
            'Browser request coordination is unavailable. No request was sent; try again later.',
        })
      } finally {
        pending = null
      }
    })()
    return pending
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    start() {
      if (started) {
        sync()
        return
      }
      started = true
      sync()
      if (!state.snapshot) void refresh()
    },
    sync,
    expire() {
      if (
        state.saved &&
        state.snapshot &&
        now() -
          Math.min(
            Date.parse(state.snapshot.retrieved_at),
            Date.parse(state.snapshot.generated_at),
          ) >=
          RETENTION_MS
      )
        sync()
    },
    refresh,
    clearCache() {
      if (cache.clear()) update({ saved: false })
      else update({})
    },
    coordinationLimited: !locks,
  }
}
