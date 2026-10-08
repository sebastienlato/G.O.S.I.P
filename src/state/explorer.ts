import { type AdditionalSource, additionalLayers } from '../data/additional'
import { parseCursor, parsePlace, supportsPlayback } from '../data/history'
import {
  digitalFamilies,
  digitalResults,
  type DigitalFamily,
  type DigitalResult,
} from '../data/digital'
import { reportLanguages, type ReportLanguage } from '../data/reports'
import { categories, type Category, type WindowHours } from '../data/events'

export const categoryKeys = Object.keys(categories) as Category[]
export type Source =
  | AdditionalSource
  | 'demo'
  | 'usgs'
  | 'nws'
  | 'fire-demo'
  | 'reports-demo'
  | 'digital-demo'
export interface ExplorerFilters {
  source: Source
  cursor: number | null
  country: string
  region: string
  digitalFamily: DigitalFamily | 'all'
  digitalResult: DigitalResult | 'all'
  language: ReportLanguage | 'all'
  reportStatus: 'all' | 'corrected'
  query: string
  selectedCategories: Category[]
  hours: WindowHours
  view: 'map' | 'list'
  mapMode: 'interactive' | 'static'
}
export const defaultFilters: ExplorerFilters = {
  source: 'demo',
  cursor: null,
  country: '',
  region: '',
  digitalFamily: 'all',
  digitalResult: 'all',
  query: '',
  language: 'all',
  reportStatus: 'all',
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
    cursor: supportsPlayback(params.get('source') ?? 'demo')
      ? parseCursor(params.get('at'))
      : null,
    country: parsePlace(params.get('country')),
    region: parsePlace(params.get('region')),
    source: [
      'usgs',
      'nws',
      'fire-demo',
      'reports-demo',
      'digital-demo',
      ...Object.keys(additionalLayers),
    ].includes(params.get('source') ?? '')
      ? (params.get('source') as Source)
      : 'demo',
    digitalFamily:
      params.get('source') === 'digital-demo' &&
      Object.hasOwn(digitalFamilies, params.get('digital') ?? '')
        ? (params.get('digital') as DigitalFamily)
        : 'all',
    digitalResult:
      params.get('source') === 'digital-demo' &&
      Object.hasOwn(digitalResults, params.get('result') ?? '')
        ? (params.get('result') as DigitalResult)
        : 'all',
    language:
      params.get('source') === 'reports-demo' &&
      Object.hasOwn(reportLanguages, params.get('lang') ?? '')
        ? (params.get('lang') as ReportLanguage)
        : 'all',
    reportStatus:
      params.get('source') === 'reports-demo' &&
      params.get('reports') === 'corrected'
        ? 'corrected'
        : 'all',
    query: (params.get('q') ?? '')
      .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '')
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
  if (supportsPlayback(filters.source) && filters.cursor !== null)
    params.set('at', new Date(filters.cursor).toISOString())
  if (filters.country) params.set('country', filters.country)
  if (filters.region) params.set('region', filters.region)
  if (filters.source !== 'demo') params.set('source', filters.source)
  if (filters.source === 'digital-demo') {
    if (filters.digitalFamily !== 'all')
      params.set('digital', filters.digitalFamily)
    if (filters.digitalResult !== 'all')
      params.set('result', filters.digitalResult)
  }
  if (filters.source === 'reports-demo') {
    if (filters.language !== 'all') params.set('lang', filters.language)
    if (filters.reportStatus !== 'all')
      params.set('reports', filters.reportStatus)
  }
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
