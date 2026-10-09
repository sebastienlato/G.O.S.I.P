import { describe, expect, it } from 'vitest'
import {
  additionalExamples,
  additionalBySource,
  additionalLayers,
  parseAdditionalExamples,
  isAdditional,
  additionalReadout,
} from './additional'
import {
  categories,
  DEMO_TIME,
  filterEvents,
  eventTime,
  hasCoordinates,
} from './events'
import { matchesPlace, supportsPlayback } from './history'
import { parseFilters, serializeFilters, categoryKeys } from '../state/explorer'

const clone = () => structuredClone(additionalExamples[0])
describe('additional original fixtures', () => {
  it('contains independent bounded sources, with original authors and explicit missing locations', () => {
    expect(additionalExamples).toHaveLength(12)
    expect(new Set(additionalExamples.map((e) => e.id)).size).toBe(12)
    for (const source of Object.keys(
      additionalLayers,
    ) as (keyof typeof additionalLayers)[]) {
      const events = additionalBySource[source]
      expect(events).toHaveLength(4)
      expect(events.filter(hasCoordinates)).toHaveLength(2)
      expect(events.every((e) => e.is_demo && isAdditional(e))).toBe(true)
      expect(events.filter((e) => e.value === null)).toHaveLength(1)
      expect(events.filter((e) => e.observed_at === null)).toHaveLength(2)
      expect(supportsPlayback(source)).toBe(true)
    }
  })
  it('uses publication windows and order, independently of sample/plan/update and device clock', () => {
    for (const events of Object.values(additionalBySource)) {
      expect(
        [6, 24, 72, 168].map(
          (hours) =>
            filterEvents(
              events,
              '',
              categoryKeys,
              hours as 6 | 24 | 72 | 168,
              DEMO_TIME,
            ).length,
        ),
      ).toEqual([1, 2, 3, 4])
      expect(
        filterEvents(events, '', categoryKeys, 168).map((e) => e.id),
      ).toEqual(events.map((e) => e.id))
      expect(eventTime(events[0])).toBe(events[0].published_at)
      expect(
        filterEvents(
          events,
          '',
          categoryKeys,
          24,
          Date.parse(events[1].published_at),
        ).map((e) => e.id),
      ).toEqual([events[1].id])
      expect(Date.parse(events[1].interval_end)).toBeGreaterThan(DEMO_TIME)
      expect(additionalReadout(events[1])).toContain('planned, not observed')
    }
  })
  it('uses inclusive publication cutoffs and never includes future publications', () => {
    const e = clone(),
      pub = Date.parse(e.published_at)
    expect(filterEvents([e], '', categoryKeys, 6, pub - 1)).toHaveLength(0)
    expect(filterEvents([e], '', categoryKeys, 6, pub)).toHaveLength(1)
    expect(
      filterEvents([e], '', categoryKeys, 6, pub + 6 * 3600000),
    ).toHaveLength(1)
    expect(
      filterEvents([e], '', categoryKeys, 6, pub + 6 * 3600000 + 1),
    ).toHaveLength(0)
  })
  it('supports source/layer/search/place filtering without inferring nationality or positions', () => {
    const events = additionalBySource['maritime-demo']
    expect(events.filter((e) => matchesPlace(e, '~unknown', ''))).toHaveLength(
      4,
    )
    expect(
      events.filter((e) => matchesPlace(e, '~unknown', 'North Atlantic')),
    ).toHaveLength(1)
    expect(filterEvents(events, 'planned', categoryKeys, 168)).toHaveLength(1)
    expect(filterEvents(events, 'port calls', categoryKeys, 168)).toHaveLength(
      4,
    )
    expect(filterEvents(events, '', [], 168)).toHaveLength(0)
    expect(Object.keys(categories)).toHaveLength(5)
  })
  it('round-trips source, places, window and cursor and drops incompatible filters', () => {
    for (const source of Object.keys(additionalLayers)) {
      const filters = parseFilters(
        `?source=${source}&view=list&map=static&hours=168&country=~unknown&at=2026-10-07T16:00:00.000Z&digital=outage&lang=fr`,
      )
      expect(filters.source).toBe(source)
      expect(filters.cursor).toBe(DEMO_TIME - 86400000)
      expect(filters.digitalFamily).toBe('all')
      expect(filters.language).toBe('all')
      expect(parseFilters(serializeFilters(filters))).toEqual(filters)
    }
    expect(parseFilters('?source=space-live').source).toBe('usgs')
  })
  it('allows an invented zero sample while keeping gap values null', () => {
    expect(parseAdditionalExamples([{ ...clone(), value: 0 }])[0].value).toBe(0)
    expect(additionalReadout(additionalExamples[2])).toContain(
      'missing coverage is not zero',
    )
  })
  it.each([
    { is_demo: false },
    { source_name: 'External provider' },
    { id: 'real-123' },
    { id: 'space-demo-<script>' },
    { family: 'satellite' },
    { category: 'civic' },
    { unit: 'people' },
    { value: -1 },
    { value: 1.2 },
    { value: 10001 },
    { value: null },
    { value: Infinity },
    { title: 'x'.repeat(151) },
    { country: 'x'.repeat(101) },
    { summary: 'bad\u202etext' },
    { coordinates: [-71, -25] },
    { coordinates: [190, 0] },
    { coordinates: [0, 90] },
    { coordinates: [0, 0, 0] },
    { coordinates: null },
    { location_precision: 'unknown' },
    { location_precision: ['unknown'], coordinates: null },
    { basis: 'observed' },
    { occurred_at: '2026-10-08T00:00:00.000Z' },
    { observed_at: null },
    { observed_at: '2026-10-08T13:00:00.000Z' },
    { published_at: '2026-02-30T12:00:00.000Z' },
    { published_at: '2026-10-09T00:00:00.000Z' },
    { updated_at: '2026-10-01T00:00:00.000Z' },
    { collected_at: '2026-10-09T16:00:00.000Z' },
    { interval_end: '2026-10-06T00:00:00.000Z' },
    { source_url: 'https://example.com' },
    { icao24: 'abc123' },
    { mmsi: '123456789' },
    { tle: 'raw orbital elements' },
  ])('rejects unsafe or inconsistent input %j', (patch) => {
    expect(() => parseAdditionalExamples([{ ...clone(), ...patch }])).toThrow()
  })
  it('rejects oversized/duplicate/missing fields and inconsistent plan/gap semantics', () => {
    expect(() => parseAdditionalExamples(Array(51).fill(clone()))).toThrow()
    expect(() => parseAdditionalExamples([clone(), clone()])).toThrow()
    const partial = { ...clone() } as Partial<ReturnType<typeof clone>>
    delete partial.uncertainty
    expect(() => parseAdditionalExamples([partial])).toThrow()
    const plan = additionalExamples[1],
      gap = additionalExamples[2]
    for (const e of [
      { ...plan, observed_at: plan.interval_end },
      { ...plan, interval_start: plan.published_at },
      { ...gap, value: 0 },
      { ...gap, observed_at: gap.interval_end },
      { ...gap, coordinates: [0, 0] },
    ])
      expect(() => parseAdditionalExamples([e])).toThrow()
  })
})
