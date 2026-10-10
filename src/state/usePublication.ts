import { useEffect, useState } from 'react'
import { decodeRelease, type Release } from '../data/archive'
import { readBounded } from '../data/published'
import { assetPath } from './assetPath'
export function usePublication() {
  const [release, setRelease] = useState<Release | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true,
      pending = false,
      last = 0
    const refresh = async () => {
      if (
        pending ||
        Date.now() - last < 60_000 ||
        document.visibilityState === 'hidden' ||
        !navigator.onLine
      )
        return
      pending = true
      last = Date.now()
      try {
        const raw = await readBounded(
          await fetch(assetPath('/release.json'), {
            credentials: 'omit',
            cache: 'no-cache',
            redirect: 'error',
            signal: AbortSignal.timeout(12_000),
          }),
          2000,
        )
        const next = decodeRelease(JSON.parse(raw), Date.now())
        if (alive) {
          setRelease(next)
          setFailed(false)
        }
      } catch {
        if (alive) setFailed(true)
      } finally {
        pending = false
      }
    }
    void refresh()
    const poll = setInterval(() => void refresh(), 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      alive = false
      clearInterval(poll)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [])
  return { release, failed }
}
