import { isMaritime } from '../data/maritime'
import { isLaunch } from '../data/launches'
import { isOoni } from '../data/ooni'
import { isNews } from '../data/news'
import { isFireSummary } from '../data/firms'
import { isWarning } from '../data/dwd'
import { isHazard } from '../data/eonet'
import { categories, type ExplorerEvent } from '../data/events'

// Visual encoding shared by map markers, the legend and feed cards.
// Colour is reserved for data: magnitude for earthquakes, kind for hazards.
export const magnitudeSteps = [
  { min: -Infinity, label: 'Below 4', color: '#e9b44c' },
  { min: 4, label: '4–4.9', color: '#f08a3e' },
  { min: 5, label: '5–5.9', color: '#e8553a' },
  { min: 6, label: '6 and above', color: '#d42d55' },
] as const
export const maritimeColor = '#58dfdf'
export const launchColor = '#d5a6ff'
export const ooniColor = '#82aaff'
export const newsColor = '#f3a77b'
export const fireColor = '#ffd23f'
export const warningColor = '#cfd8dc'
export const hazardColors = { volcanoes: '#f07cae', severeStorms: '#62c6e8' }

export const magnitudeColor = (magnitude: number | null) =>
  magnitude === null
    ? '#a9b8bc'
    : [...magnitudeSteps].reverse().find((step) => magnitude >= step.min)!.color

/** Ring diameter in px: M2.5 ≈ 11px, M4.5 ≈ 19px, M6.5 ≈ 31px, M7.5 ≈ 38px. */
export const magnitudeSize = (magnitude: number | null) =>
  magnitude === null
    ? 11
    : Math.round(Math.min(40, 11 + Math.max(0, magnitude - 2.5) ** 1.3 * 3.4))

export type MarkerKind =
  | 'maritime'
  | 'launch'
  | 'ooni'
  | 'news'
  | 'quake'
  | 'volcano'
  | 'storm'
  | 'warning'
  | 'fire'
  | 'example'
export interface Encoding {
  kind: MarkerKind
  color: string
  size: number
  /** 1 for the newest records, fading to 0.4 across the week. */
  freshness: number
  /** Occurred within the last hour of the reference clock. */
  recent: boolean
}

export function encode(
  event: ExplorerEvent,
  referenceTime: number,
  occurredAt: string,
): Encoding {
  if (isMaritime(event))
    return {
      kind: 'maritime',
      color: maritimeColor,
      size: 26,
      freshness: 1,
      recent: false,
    }
  if (isLaunch(event))
    return {
      kind: 'launch',
      color: launchColor,
      size: 26,
      freshness: 1,
      recent: false,
    }
  if (isOoni(event))
    return {
      kind: 'ooni',
      color: ooniColor,
      size: 20,
      freshness: 1,
      recent: false,
    }
  if (isNews(event))
    return {
      kind: 'news',
      color: newsColor,
      size: 16,
      freshness: 1,
      recent: false,
    }
  const age = Math.max(0, referenceTime - Date.parse(occurredAt))
  const freshness = Math.max(0.4, 1 - (age / (7 * 86_400_000)) * 0.6)
  if (isFireSummary(event))
    return {
      kind: 'fire',
      color: fireColor,
      size: 16,
      freshness: 1,
      recent: false,
    }
  if (isWarning(event))
    return {
      kind: 'warning',
      color: warningColor,
      size: 16,
      freshness: 1,
      recent: false,
    }
  if (isHazard(event)) {
    const volcano = event.hazard_categories.includes('volcanoes')
    return {
      kind: volcano ? 'volcano' : 'storm',
      color: volcano ? hazardColors.volcanoes : hazardColors.severeStorms,
      size: 26,
      freshness: Math.max(freshness, 0.7),
      recent: false,
    }
  }
  if (!event.is_demo && 'magnitude' in event) {
    return {
      kind: 'quake',
      color: magnitudeColor(event.magnitude),
      size: magnitudeSize(event.magnitude),
      freshness,
      recent: age < 3_600_000,
    }
  }
  return {
    kind: 'example',
    color: categories[event.category].color,
    size: 24,
    freshness: 1,
    recent: false,
  }
}

/** Larger and older markers first so small, fresh ones stay on top. */
export const drawOrder = (a: Encoding, b: Encoding) =>
  b.size - a.size || a.freshness - b.freshness
