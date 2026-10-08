import { categories, type Category, type WindowHours } from '../data/events'

export const categoryKeys = Object.keys(categories) as Category[]
export interface ExplorerFilters {
  query: string
  selectedCategories: Category[]
  hours: WindowHours
  view: 'map' | 'list'
  mapMode: 'interactive' | 'static'
}
export const defaultFilters: ExplorerFilters = {
  query: '',
  selectedCategories: categoryKeys,
  hours: 24,
  view: 'map',
  mapMode: 'interactive',
}

// URL values are untrusted: accept only known modes, windows and category keys.
export function parseFilters(search: string): ExplorerFilters {
  const params = new URLSearchParams(search.length <= 4096 ? search : '')
  const layers = params.get('layers')
  const requested = layers === '' ? [] : layers?.split(',')
  const selectedCategories = requested?.every((key) =>
    categoryKeys.includes(key as Category),
  )
    ? categoryKeys.filter((key) => requested.includes(key))
    : categoryKeys
  const hours = params.get('hours')
  return {
    query: (params.get('q') ?? '')
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, 200),
    selectedCategories,
    hours:
      hours && ['6', '24', '72', '168'].includes(hours)
        ? (Number(hours) as WindowHours)
        : 24,
    view: params.get('view') === 'list' ? 'list' : 'map',
    mapMode: params.get('map') === 'static' ? 'static' : 'interactive',
  }
}

export function serializeFilters(filters: ExplorerFilters): string {
  const params = new URLSearchParams()
  if (filters.query) params.set('q', filters.query)
  if (filters.hours !== 24) params.set('hours', String(filters.hours))
  if (filters.selectedCategories.length !== categoryKeys.length)
    params.set(
      'layers',
      categoryKeys
        .filter((key) => filters.selectedCategories.includes(key))
        .join(','),
    )
  if (filters.view !== 'map') params.set('view', filters.view)
  if (filters.mapMode === 'static') params.set('map', 'static')
  const query = params.toString()
  return query ? `?${query}` : ''
}
