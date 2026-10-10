import { useCallback, useEffect, useRef, useState } from 'react'
import {
  parsePublicFilters,
  serializePublicFilters,
  type ExplorerFilters,
} from './explorer'

export function useExplorerFilters() {
  const [filters, setFilters] = useState(() =>
    parsePublicFilters(window.location.search),
  )
  const current = useRef(filters)
  useEffect(() => {
    const restore = () => {
      current.current = parsePublicFilters(window.location.search)
      setFilters(current.current)
    }
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${serializePublicFilters(current.current)}${window.location.hash}`,
    )
    window.addEventListener('popstate', restore)
    return () => window.removeEventListener('popstate', restore)
  }, [])
  const updateFilters = useCallback(
    (patch: Partial<ExplorerFilters>, replace = false) => {
      const next = { ...current.current, ...patch }
      if (next.source !== current.current.source) {
        next.history = ''
        next.cursor = null
        next.country = ''
        next.region = ''
        next.digitalFamily = 'all'
        next.digitalResult = 'all'
        next.language = 'all'
        next.reportStatus = 'all'
      }
      const validated = parsePublicFilters(serializePublicFilters(next))
      const search = serializePublicFilters(validated)
      if (search !== window.location.search) {
        window.history[replace ? 'replaceState' : 'pushState'](
          null,
          '',
          `${window.location.pathname}${search}${window.location.hash}`,
        )
      }
      current.current = validated
      setFilters(validated)
    },
    [],
  )
  return [filters, updateFilters] as const
}
