import type { ExplorerEvent } from './events'

export const additionalLayers = {
  'space-demo': {
    label: 'Space',
    family: 'space',
    category: 'science',
    unit: 'catalog entries',
    caveat:
      'Catalog entries are not orbital positions or unique objects in view. No orbit propagation, ground track or collision assessment.',
  },
  'aviation-demo': {
    label: 'Aviation',
    family: 'aviation',
    category: 'physical',
    unit: 'flight movements',
    caveat:
      'Movements are arrivals or departures in a fictional sample, not unique aircraft or passengers. Schedules do not establish actual flights, delays or safety.',
  },
  'maritime-demo': {
    label: 'Maritime',
    family: 'maritime',
    category: 'physical',
    unit: 'port calls',
    caveat:
      'Port calls are fictional activity counts, not unique vessels, cargo or crew. Plans do not establish arrivals, routes or safety.',
  },
} as const
export type AdditionalSource = keyof typeof additionalLayers
export const isAdditionalSource = (
  source: string,
): source is AdditionalSource => Object.hasOwn(additionalLayers, source)
export const additionalBases = {
  'sample-summary': 'Sample summary · synthetic',
  'planned-window': 'Planned window · synthetic',
  'coverage-gap': 'Coverage gap · synthetic',
} as const
export interface AdditionalEvent {
  id: string
  kind: 'additional'
  family: 'space' | 'aviation' | 'maritime'
  category: 'science' | 'physical'
  title: string
  summary: string
  region: string
  country: string
  coordinates: [number, number] | null
  location_precision: 'region' | 'unknown' | 'withheld'
  basis: keyof typeof additionalBases
  interval_start: string
  interval_end: string
  occurred_at: null
  observed_at: string | null
  published_at: string
  updated_at: string | null
  collected_at: string
  value: number | null
  unit: 'catalog entries' | 'flight movements' | 'port calls'
  source_name: 'GOSIP fixture authors'
  coverage_note: string
  uncertainty: string
  is_demo: true
  status: 'simulated'
  freshness: 'fixed-demo'
}
const fields =
  'id kind family category title summary region country coordinates location_precision basis interval_start interval_end occurred_at observed_at published_at updated_at collected_at value unit source_name coverage_note uncertainty is_demo status freshness'
    .split(' ')
    .sort()
    .join(',')
const SNAPSHOT = '2026-10-08T16:00:00.000Z'
const START = Date.parse('2026-10-01T16:00:00.000Z')
const END = Date.parse(SNAPSHOT)
function timestamp(value: unknown): number {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    throw new Error('Invalid additional timestamp')
  return Date.parse(value)
}
export function parseAdditionalExamples(input: unknown): AdditionalEvent[] {
  if (!Array.isArray(input) || input.length > 50)
    throw new Error('Invalid additional envelope')
  const ids = new Set<string>()
  return input.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error('Invalid additional record')
    const e = item as Record<string, unknown>
    if (Object.keys(e).sort().join(',') !== fields)
      throw new Error('Unknown or missing additional fields')
    const config = Object.values(additionalLayers).find(
      (layer) => layer.family === e.family,
    )
    if (
      !config ||
      e.category !== config.category ||
      e.unit !== config.unit ||
      e.kind !== 'additional' ||
      e.is_demo !== true ||
      e.status !== 'simulated' ||
      e.freshness !== 'fixed-demo' ||
      e.source_name !== 'GOSIP fixture authors' ||
      e.occurred_at !== null
    )
      throw new Error('Invalid simulation contract')
    if (
      typeof e.id !== 'string' ||
      !new RegExp(`^${config.family}-demo-[a-z0-9-]{1,40}$`).test(e.id) ||
      ids.has(e.id)
    )
      throw new Error('Invalid additional ID')
    ids.add(e.id)
    for (const key of [
      'title',
      'summary',
      'region',
      'country',
      'coverage_note',
      'uncertainty',
    ]) {
      const value = e[key]
      const max =
        key === 'country' || key === 'region'
          ? 100
          : key === 'title'
            ? 150
            : 700
      if (
        typeof value !== 'string' ||
        (key !== 'country' && !value.trim()) ||
        value !== value.trim() ||
        value.length > max ||
        /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value)
      )
        throw new Error('Invalid additional text')
    }
    if (
      typeof e.location_precision !== 'string' ||
      !['region', 'unknown', 'withheld'].includes(e.location_precision)
    )
      throw new Error('Invalid additional location')
    if (e.location_precision === 'region') {
      if (
        !Array.isArray(e.coordinates) ||
        e.coordinates.length !== 2 ||
        !e.coordinates.every(
          (n) => typeof n === 'number' && Number.isFinite(n) && n % 5 === 0,
        ) ||
        Math.abs(e.coordinates[0]) > 180 ||
        Math.abs(e.coordinates[1]) > 85
      )
        throw new Error('Invalid broad coordinates')
    } else if (e.coordinates !== null)
      throw new Error('Unmapped location has coordinates')
    if (typeof e.basis !== 'string' || !Object.hasOwn(additionalBases, e.basis))
      throw new Error('Invalid additional basis')
    const start = timestamp(e.interval_start),
      end = timestamp(e.interval_end),
      published = timestamp(e.published_at),
      collected = timestamp(e.collected_at)
    if (
      start < START ||
      end <= start ||
      end - start > 24 * 3_600_000 ||
      end > END + 7 * 86400_000 ||
      published < START ||
      published > collected ||
      e.collected_at !== SNAPSHOT
    )
      throw new Error('Invalid additional time order')
    if (
      e.updated_at !== null &&
      (timestamp(e.updated_at) < published ||
        timestamp(e.updated_at) > collected)
    )
      throw new Error('Invalid additional update')
    if (e.basis === 'sample-summary') {
      if (timestamp(e.observed_at) !== end || end > published)
        throw new Error('Invalid sample observation')
    } else if (e.observed_at !== null)
      throw new Error('Plans and gaps have no observation')
    if (e.basis === 'planned-window' ? start <= published : end > published)
      throw new Error('Invalid basis interval')
    if (e.basis === 'coverage-gap') {
      if (e.value !== null) throw new Error('Missing data is not zero')
    } else if (
      typeof e.value !== 'number' ||
      !Number.isSafeInteger(e.value) ||
      e.value < 0 ||
      e.value > 10000
    )
      throw new Error('Invalid activity value')
    return e as unknown as AdditionalEvent
  })
}

export const isAdditional = (event: ExplorerEvent): event is AdditionalEvent =>
  'kind' in event && event.kind === 'additional'
export const additionalReadout = (event: AdditionalEvent) =>
  event.value === null
    ? 'Not supplied · missing coverage is not zero activity'
    : `${event.value} ${event.unit} · ${event.basis === 'planned-window' ? 'planned, not observed' : 'invented sample, not people'}`
