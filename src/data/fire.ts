import { DEMO_NOW, DEMO_TIME, parseDemoEvents, type DemoEvent } from './events'
export interface ThermalEvent extends DemoEvent {
  kind: 'thermal'
  radiative_power_mw: number
  brightness_kelvin: number
  confidence: 'low' | 'nominal' | 'high'
}
export const FIRE_NOTE =
  'Synthetic thermal-anomaly examples, not NASA detections. A satellite hot pixel can reflect vegetation burning, industry or other heat sources; it is not a confirmed wildfire perimeter, burned area, cause or impact. Clouds, overpass timing, resolution and processing gaps can hide activity. No marker does not mean no fire.'
export function parseThermalExamples(input: unknown): ThermalEvent[] {
  const events = parseDemoEvents(input)
  return events.map((event) => {
    const e = event as ThermalEvent
    if (
      e.kind !== 'thermal' ||
      e.category !== 'environment' ||
      !['low', 'nominal', 'high'].includes(e.confidence) ||
      !Number.isFinite(e.radiative_power_mw) ||
      e.radiative_power_mw < 0 ||
      e.radiative_power_mw > 10000 ||
      !Number.isFinite(e.brightness_kelvin) ||
      e.brightness_kelvin < 200 ||
      e.brightness_kelvin > 1000
    )
      throw new Error('Invalid synthetic thermal sample')
    return e
  })
}
export const fireExamples = parseThermalExamples(
  [
    [
      'Woodland hot-pixel scenario',
      'Western North America',
      'United States',
      -120,
      40,
      2,
      18,
      335,
      'nominal',
    ],
    [
      'Industrial heat scenario',
      'Southeast Australia',
      'Australia',
      145,
      -37,
      9,
      8,
      321,
      'high',
    ],
    [
      'Cloud-edge uncertainty scenario',
      'Central South America',
      'Brazil',
      -55,
      -12,
      30,
      3,
      309,
      'low',
    ],
    [
      'Overpass gap scenario',
      'Southern Africa',
      'South Africa',
      25,
      -29,
      80,
      12,
      328,
      'nominal',
    ],
  ].map(
    (
      [title, region, country, lon, lat, hours, power, brightness, confidence],
      index,
    ) => ({
      id: `thermal-demo-${index}`,
      kind: 'thermal',
      title,
      region,
      country,
      coordinates: [lon, lat],
      category: 'environment',
      summary: FIRE_NOTE,
      source_name: 'GOSIP original synthetic sensor examples',
      occurred_at: new Date(DEMO_TIME - Number(hours) * 3600_000).toISOString(),
      published_at: new Date(
        DEMO_TIME - Number(hours) * 3600_000 + 300_000,
      ).toISOString(),
      collected_at: DEMO_NOW,
      status: 'simulated',
      is_demo: true,
      freshness: 'fixed-demo',
      coverage_note: FIRE_NOTE,
      radiative_power_mw: power,
      brightness_kelvin: brightness,
      confidence,
    }),
  ),
)
