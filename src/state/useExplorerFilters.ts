import { useCallback, useEffect, useRef, useState } from 'react'
import {
  parseFilters,
  serializeFilters,
  type ExplorerFilters,
} from './explorer'

export function useExplorerFilters() {
  const [filters, setFilters] = useState(() =>
    parseFilters(window.location.search),
  )
  const current = useRef(filters)
  useEffect(() => {
    const restore = () => {
      current.current = parseFilters(window.location.search)
      setFilters(current.current)
    }
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${serializeFilters(current.current)}${window.location.hash}`,
    )
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])
  const updateFilters = useCallback(
    (patch: Partial<ExplorerFilters>, replace = false) => {
      const next = { ...current.current, ...patch }
      if (next.source !== current.current.source) {
        next.cursor = null
        next.country = ''
        next.region = ''
        next.digitalFamily = 'all'
        next.digitalResult = 'all'
        next.language = 'all'
        next.reportStatus = 'all'
      }
      const search = serializeFilters(next)
      if (search !== window.location.search) {
        window.history[replace ? 'replaceState' : 'pushState'](
          null,
          '',
          `${window.location.pathname}${search}${window.location.hash}`,
        )
      }
      current.current = next
      setFilters(next)
    },
    [],
  )
  return [filters, updateFilters] as const
}
