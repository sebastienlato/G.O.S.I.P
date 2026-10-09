import { useCallback, useEffect, useRef, useState } from 'react'
import { ARCHIVE_MAX_BYTES, decodeArchive, type Archive } from '../data/archive'
import { readBounded } from '../data/published'
import { assetPath } from './assetPath'

export function useArchive(enabled: boolean) {
  const [archive, setArchive] = useState<Archive | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const retryAt = useRef(0)
  const pending = useRef(false)
  const refresh = useCallback(async () => {
    if (pending.current || Date.now() < retryAt.current) return
    pending.current = true
    retryAt.current = Date.now() + 60_000
    setLoading(true)
    try {
      const raw = await readBounded(
        await fetch(assetPath('/data/history.json'), {
          signal: AbortSignal.timeout(12_000),
          cache: 'no-cache',
          credentials: 'omit',
          redirect: 'error',
        }),
        ARCHIVE_MAX_BYTES,
      )
      const next = decodeArchive(raw, Date.now())
      setArchive((previous) =>
        next.status === 'degraded' && !next.captures.length && previous
          ? {
              ...previous,
              attempted_at: next.attempted_at,
              status: next.status,
              error: next.error,
            }
          : next,
      )
      setError('')
    } catch {
      setError(
        'History unavailable. Any previously loaded captures keep their original times.',
      )
    } finally {
      pending.current = false
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    if (!enabled) return
    void refresh()
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh()
    }, 15 * 60_000)
    return () => window.clearInterval(timer)
  }, [enabled, refresh])
  return { archive, error, loading, refresh }
}
