import type { DemoEvent, ExplorerEvent } from './events'
import rawExamples from './digitalExamples.json'

export const digitalFamilies = {
  outage: 'Outage signals',
  interference: 'Censorship measurements',
} as const
export const digitalResults = {
  anomaly: 'Measurement anomaly',
  'no-anomaly': 'No anomaly in sample',
  'no-samples': 'No samples',
  inconclusive: 'Inconclusive',
} as const
export type DigitalFamily = keyof typeof digitalFamilies
export type DigitalResult = keyof typeof digitalResults
export interface DigitalEvent extends Omit<DemoEvent, 'coordinates'> {
  kind: 'digital'
  family: DigitalFamily
  result: DigitalResult
  coordinates: [number, number] | null
  location_precision: 'region' | 'unknown' | 'withheld'
  interval_end: string
  updated_at: string | null
  method: 'active-probing' | 'web-connectivity'
  network_asn: number | null
  sample_count: number | null
  missing_samples: number | null
  anomaly_count: number | null
  signal_value: number | null
  baseline_value: number | null
  baseline_start: string | null
  baseline_end: string | null
  aggregation: string
  uncertainty: string
}
export const isDigital = (event: ExplorerEvent): event is DigitalEvent =>
  'kind' in event && event.kind === 'digital'
export const DIGITAL_COVERAGE =
  'Six original synthetic scenarios, not live outage or censorship reports. An anomaly is not a confirmed outage or intentional blocking. No samples is not proof of connectivity or absence of blocking. Probes, volunteer tests and sampled networks do not represent a population.'

function text(value: unknown, max = 1200): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)
  )
    throw new Error('Invalid digital text')
  return value.trim()
}
function date(value: unknown): string {
  const iso = text(value, 24)
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(iso) ||
    !Number.isFinite(Date.parse(iso)) ||
    new Date(iso).toISOString() !== iso
  )
    throw new Error('Invalid digital date')
  return iso
}
function count(value: unknown): number | null {
  if (value === null) return null
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 1_000_000
  )
    throw new Error('Invalid digital count')
  return value
}

// Fixture-only adapter. Unknown fields are rejected, including probe IPs, URLs
// and contributor data. A future real source needs its own bounded adapter.
export function parseDigitalExamples(input: unknown): DigitalEvent[] {
  if (!Array.isArray(input) || input.length > 50)
    throw new Error('Invalid digital envelope')
  const ids = new Set<string>()
  const keys = new Set(
    'id title summary category region country coordinates occurred_at published_at collected_at source_name status is_demo freshness coverage_note kind family result location_precision interval_end updated_at method network_asn sample_count missing_samples anomaly_count signal_value baseline_value baseline_start baseline_end aggregation uncertainty'.split(
      ' ',
    ),
  )
  return input.map((value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Invalid digital object')
    const e = value as Record<string, unknown>
    if (Object.keys(e).some((key) => !keys.has(key)))
      throw new Error('Unexpected digital field')
    const id = text(e.id, 64)
    if (!/^digital-demo-[a-z0-9-]+$/.test(id) || ids.has(id))
      throw new Error('Invalid or duplicate digital ID')
    ids.add(id)
    if (
      e.kind !== 'digital' ||
      e.category !== 'digital' ||
      e.is_demo !== true ||
      e.status !== 'simulated' ||
      e.freshness !== 'fixed-demo' ||
      e.source_name !== 'GOSIP original digital fixtures'
    )
      throw new Error('Only labeled digital simulations accepted')
    const family = text(e.family, 20) as DigitalFamily
    const result = text(e.result, 20) as DigitalResult
    if (
      !Object.hasOwn(digitalFamilies, family) ||
      !Object.hasOwn(digitalResults, result) ||
      e.method !== (family === 'outage' ? 'active-probing' : 'web-connectivity')
    )
      throw new Error('Invalid digital method/result')
    const start = date(e.occurred_at),
      end = date(e.interval_end)
    const published = date(e.published_at),
      collected = date(e.collected_at)
    const updated = e.updated_at === null ? null : date(e.updated_at)
    if (
      start >= end ||
      end > published ||
      published > collected ||
      collected !== '2026-10-08T16:00:00.000Z' ||
      (updated !== null && (updated < published || updated > collected))
    )
      throw new Error('Invalid digital time order')
    let coordinates: [number, number] | null = null
    if (e.location_precision === 'region') {
      if (
        !Array.isArray(e.coordinates) ||
        e.coordinates.length !== 2 ||
        !e.coordinates.every(
          (n) => typeof n === 'number' && Number.isInteger(n) && n % 5 === 0,
        ) ||
        Math.abs(e.coordinates[0]) > 180 ||
        Math.abs(e.coordinates[1]) > 90
      )
        throw new Error('Expected a broad five-degree marker')
      coordinates = [e.coordinates[0], e.coordinates[1]]
    } else if (
      !['unknown', 'withheld'].includes(String(e.location_precision)) ||
      e.coordinates !== null
    )
      throw new Error('Unmapped digital examples must omit coordinates')
    const samples = count(e.sample_count),
      missing = count(e.missing_samples)
    const anomalies = count(e.anomaly_count),
      signal = count(e.signal_value),
      baseline = count(e.baseline_value)
    const baselineStart =
      e.baseline_start === null ? null : date(e.baseline_start)
    const baselineEnd = e.baseline_end === null ? null : date(e.baseline_end)
    if (
      (baseline === null) !== (baselineStart === null) ||
      (baseline === null) !== (baselineEnd === null) ||
      (baselineStart !== null &&
        baselineEnd !== null &&
        (baselineStart >= baselineEnd || baselineEnd > start))
    )
      throw new Error('Invalid digital baseline')
    if (anomalies !== null && (samples === null || anomalies > samples))
      throw new Error('Missing/invalid anomaly denominator')
    if (
      family === 'outage'
        ? anomalies !== null
        : signal !== null || baseline !== null
    )
      throw new Error('Mixed digital units')
    if (
      result === 'no-samples'
        ? samples !== 0 || anomalies !== null || signal !== null
        : samples === 0
    )
      throw new Error('Invalid no-samples state')
    if (
      (samples === null && result !== 'inconclusive') ||
      (family === 'interference' &&
        result === 'anomaly' &&
        (anomalies === null || anomalies === 0)) ||
      (family === 'interference' &&
        result === 'no-anomaly' &&
        anomalies !== 0) ||
      (family === 'outage' &&
        ['anomaly', 'no-anomaly'].includes(result) &&
        (signal === null || baseline === null))
    )
      throw new Error('Insufficient digital evidence')
    const asn = count(e.network_asn)
    if (asn !== null && (asn < 64512 || asn > 65534))
      throw new Error('Only fictional private-use ASNs accepted')
    return {
      id,
      kind: 'digital',
      category: 'digital',
      is_demo: true,
      status: 'simulated',
      freshness: 'fixed-demo',
      source_name: 'GOSIP original digital fixtures',
      title: text(e.title, 240),
      summary: text(e.summary),
      region: text(e.region, 120),
      country: e.country === '' ? '' : text(e.country, 100),
      occurred_at: start,
      interval_end: end,
      published_at: published,
      collected_at: collected,
      updated_at: updated,
      coordinates,
      location_precision:
        e.location_precision as DigitalEvent['location_precision'],
      family,
      result,
      method: e.method as DigitalEvent['method'],
      network_asn: asn,
      sample_count: samples,
      missing_samples: missing,
      anomaly_count: anomalies,
      signal_value: signal,
      baseline_value: baseline,
      baseline_start: baselineStart,
      baseline_end: baselineEnd,
      aggregation: text(e.aggregation, 600),
      uncertainty: text(e.uncertainty, 600),
      coverage_note: text(e.coverage_note),
    }
  })
}
export const digitalExamples = parseDigitalExamples(rawExamples)
export const digitalMatches = (
  event: DigitalEvent,
  family: DigitalFamily | 'all',
  result: DigitalResult | 'all',
) =>
  (family === 'all' || event.family === family) &&
  (result === 'all' || event.result === result)
export const digitalReadout = (event: DigitalEvent): string => {
  if (event.result === 'no-samples') return '0 samples · connectivity unknown'
  if (event.method === 'web-connectivity')
    return event.anomaly_count === null || event.sample_count === null
      ? 'Anomaly count / denominator not supplied'
      : `${event.anomaly_count} / ${event.sample_count} tests anomalous · not people`
  return event.signal_value === null || event.baseline_value === null
    ? 'Signal / baseline not supplied'
    : `${event.signal_value} responsive blocks · baseline ${event.baseline_value} · not users`
}
