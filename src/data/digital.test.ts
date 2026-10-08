import { describe, expect, it } from 'vitest'
import raw from './digitalExamples.json'
import {
  digitalExamples,
  digitalMatches,
  digitalReadout,
  parseDigitalExamples,
} from './digital'
import {
  DEMO_TIME,
  demoEvents,
  eventBadge,
  filterEvents,
  hasCoordinates,
} from './events'
import { parseFilters, serializeFilters } from '../state/explorer'

const parse = (patch: Record<string, unknown>, index = 0) =>
  parseDigitalExamples([{ ...raw[index], ...patch }])
describe('bounded original digital measurements', () => {
  it('keeps simulations and unknown locations separate from observations', () => {
    expect(digitalExamples).toHaveLength(6)
    expect(digitalExamples.filter(hasCoordinates)).toHaveLength(4)
    expect(
      digitalExamples.every(
        (e) => e.is_demo && eventBadge(e) === 'SIMULATED · DIGITAL MEASUREMENT',
      ),
    ).toBe(true)
    expect(parseDigitalExamples([])).toEqual([])
    expect(demoEvents).toHaveLength(18)
  })
  it.each([
    { is_demo: false },
    { source_name: 'OONI' },
    { status: 'confirmed' },
    { id: '../../probe' },
    { title: 'x'.repeat(241) },
    { region: 'a\u202eb' },
    { sample_count: -1 },
    { missing_samples: NaN },
    { signal_value: Infinity },
    { network_asn: 15169 },
    { family: '__proto__' },
    { method: 'web-connectivity' },
    { source_url: 'javascript:alert(1)' },
    { probe_ip: '192.0.2.1' },
    { tested_url: 'https://example.org' },
  ])('rejects unsafe, sensitive or mislabeled data %j', (patch) => {
    expect(() => parse(patch)).toThrow()
  })
  it('bounds the envelope and rejects duplicates', () => {
    expect(() => parseDigitalExamples(Array(51).fill(raw[0]))).toThrow()
    expect(() => parseDigitalExamples([raw[0], raw[0]])).toThrow()
    expect(() => parseDigitalExamples({ events: raw })).toThrow()
  })
  it('rejects invalid calendars, reversed intervals, and invented newer retrieval', () => {
    for (const patch of [
      { occurred_at: '2026-02-30T12:00:00.000Z' },
      { interval_end: raw[0].occurred_at },
      { published_at: raw[0].occurred_at },
      { collected_at: '2026-10-09T16:00:00.000Z' },
      { updated_at: '2026-10-08T17:00:00.000Z' },
    ])
      expect(() => parse(patch)).toThrow()
  })
  it('requires broad positions or explicit omission, not probe positions', () => {
    for (const patch of [
      { coordinates: [5.123, 50.234] },
      { coordinates: [185, 50] },
      { coordinates: null },
      { location_precision: 'unknown' },
    ])
      expect(() => parse(patch)).toThrow()
    expect(
      parse({ location_precision: 'withheld', coordinates: null })[0]
        .coordinates,
    ).toBeNull()
  })
  it('does not conflate missing samples with zero, anomalies or normal connectivity', () => {
    expect(digitalReadout(digitalExamples[2])).toBe(
      '0 samples · connectivity unknown',
    )
    expect(digitalExamples[1].missing_samples).toBeNull()
    expect(digitalReadout(digitalExamples[4])).toBe(
      'Anomaly count / denominator not supplied',
    )
    expect(() => parse({ sample_count: 0 })).toThrow()
    expect(() => parse({ sample_count: null }, 1)).toThrow()
    expect(() => parse({ signal_value: 0 }, 2)).toThrow()
    expect(() => parse({ result: 'no-anomaly' }, 2)).toThrow()
  })
  it('requires consistent denominators, units and baseline intervals', () => {
    expect(() => parse({ anomaly_count: 13 }, 1)).toThrow()
    expect(() => parse({ result: 'no-anomaly' }, 1)).toThrow()
    expect(() => parse({ anomaly_count: 2 })).toThrow()
    expect(() => parse({ signal_value: 3 }, 1)).toThrow()
    expect(() => parse({ baseline_end: raw[0].interval_end })).toThrow()
    expect(() => parse({ baseline_start: null })).toThrow()
    expect(() => parse({ baseline_value: null })).toThrow()
    expect(digitalReadout(digitalExamples[1])).toBe(
      '3 / 12 tests anomalous · not people',
    )
  })
  it('uses interval overlap and interval end, never publication or update', () => {
    const filtered = filterEvents(
      digitalExamples,
      '',
      ['digital'],
      24,
      DEMO_TIME,
    )
    expect(filtered.map((e) => e.id)).toEqual([
      'digital-demo-drop',
      'digital-demo-web',
      'digital-demo-gap',
    ])
    expect(
      filterEvents(digitalExamples, '', ['digital'], 6, DEMO_TIME),
    ).toHaveLength(1)
    expect(
      filterEvents(digitalExamples, '', ['digital'], 72, DEMO_TIME),
    ).toHaveLength(4)
    expect(
      filterEvents(digitalExamples, '', ['digital'], 168, DEMO_TIME),
    ).toHaveLength(6)
    const gap = digitalExamples[2]
    expect(
      filterEvents(
        [gap],
        '',
        ['digital'],
        24,
        Date.parse(gap.interval_end) + 24 * 3_600_000,
      ),
    ).toEqual([])
    expect(
      filterEvents([gap], '', ['digital'], 24, Date.parse(gap.occurred_at)),
    ).toEqual([])
    const updated = {
      ...gap,
      updated_at: raw[0].updated_at,
      published_at: raw[0].published_at,
    }
    expect(
      filterEvents(
        [updated, digitalExamples[1]],
        '',
        ['digital'],
        24,
        DEMO_TIME,
      ).map((e) => e.id),
    ).toEqual(['digital-demo-web', 'digital-demo-gap'])
  })
  it('searches methods and supplied network context; applies both digital filters', () => {
    expect(
      filterEvents(digitalExamples, 'AS64513', ['digital'], 168),
    ).toHaveLength(1)
    expect(
      filterEvents(digitalExamples, 'web-connectivity', ['digital'], 168),
    ).toHaveLength(3)
    expect(filterEvents(digitalExamples, '', [], 168)).toEqual([])
    expect(
      digitalExamples.filter((e) =>
        digitalMatches(e, 'interference', 'anomaly'),
      ),
    ).toHaveLength(1)
    expect(
      digitalExamples.filter((e) =>
        digitalMatches(e, 'interference', 'no-samples'),
      ),
    ).toHaveLength(0)
  })
  it('validates, shares and source-scopes digital filters', () => {
    const filters = parseFilters(
      '?source=digital-demo&digital=interference&result=inconclusive&view=list&hours=168',
    )
    expect(filters).toMatchObject({
      digitalFamily: 'interference',
      digitalResult: 'inconclusive',
    })
    expect(parseFilters(serializeFilters(filters))).toEqual(filters)
    expect(
      parseFilters('?source=digital-demo&digital=__proto__&result=confirmed'),
    ).toMatchObject({ digitalFamily: 'all', digitalResult: 'all' })
    expect(
      serializeFilters(
        parseFilters('?source=usgs&digital=outage&result=anomaly'),
      ),
    ).toBe('?source=usgs')
    expect(
      serializeFilters(
        parseFilters('?source=digital-demo&lang=fr&reports=corrected'),
      ),
    ).toBe('?source=digital-demo')
  })
})
