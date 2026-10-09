import { describe, it, expect } from 'vitest'
import { DEMO_TIME, filterEvents } from './events'
import { demoProvider } from '../../tests/fixtures/legacy/events'
import { digitalExamples } from '../../tests/fixtures/legacy/digital'
import { reportExamples } from '../../tests/fixtures/legacy/reports'
import { fireExamples } from '../../tests/fixtures/legacy/fire'
import {
  categoryKeys,
  defaultFilters,
  parseFilters,
  serializeFilters,
} from '../state/explorer'
import {
  HISTORY_START,
  HOUR,
  parseCursor,
  matchesPlace,
  placeOptions,
  parseRelationships,
  correctionRelationship,
} from './history'
import input from '../../tests/fixtures/legacy/relationships.json'

describe('bounded fixture time and supplied places', () => {
  it('accepts only canonical hourly cursors inside the seven-day range', () => {
    expect(parseCursor(new Date(HISTORY_START).toISOString())).toBe(
      HISTORY_START,
    )
    expect(parseCursor(new Date(DEMO_TIME).toISOString())).toBe(DEMO_TIME)
    for (const bad of [
      '2026-10-08T17:00:00.000Z',
      '2026-10-01T15:00:00.000Z',
      '2026-02-30T16:00:00.000Z',
      '2026-10-07T16:30:00.000Z',
      'NaN',
      '2026-10-08T16:00:00Z',
    ])
      expect(parseCursor(bad)).toBeNull()
  })
  it('round trips cursors and Unicode place contexts, rejects controls and bounds text', () => {
    const state = {
      ...defaultFilters,
      source: 'reports-demo' as const,
      cursor: DEMO_TIME - 24 * HOUR,
      country: 'España',
      region: 'Western Europe',
    }
    expect(parseFilters(serializeFilters(state))).toEqual(state)
    expect(
      parseFilters('?country=%00Brazil&region=' + 'x'.repeat(301)),
    ).toMatchObject({ country: '', region: '' })
  })
  it('does not enable playback for current sources', () => {
    for (const source of ['usgs', 'nws'])
      expect(
        parseFilters(`?source=${source}&at=2026-10-07T16:00:00.000Z`).cursor,
      ).toBeNull()
  })
  it('preserves original source counts at the snapshot', () => {
    for (const [events, count] of [
      [demoProvider.getEvents(), 12],
      [fireExamples, 2],
      [reportExamples, 4],
      [digitalExamples, 3],
    ] as const)
      expect(
        filterEvents(events, '', categoryKeys, 24, DEMO_TIME),
      ).toHaveLength(count)
  })
  it('uses publication instead of correction when moving the report cursor', () => {
    const report = reportExamples.find((e) => e.correction)!
    const time = Date.parse(report.published_at)
    expect(filterEvents([report], '', categoryKeys, 24, time - 1)).toHaveLength(
      0,
    )
    expect(filterEvents([report], '', categoryKeys, 24, time)).toHaveLength(1)
    expect(filterEvents([report], '', categoryKeys, 24, time)[0]).toEqual(
      report,
    )
  })
  it('preserves half-open digital interval overlap, including full totals extending after cursor', () => {
    const event = digitalExamples[0]
    const start = Date.parse(event.occurred_at)
    expect(filterEvents([event], '', categoryKeys, 6, start)).toHaveLength(0)
    expect(
      filterEvents([event], '', categoryKeys, 6, start + HOUR),
    ).toHaveLength(1)
    expect(
      filterEvents(
        [event],
        '',
        categoryKeys,
        6,
        Date.parse(event.interval_end) + 6 * HOUR,
      ),
    ).toHaveLength(0)
  })
  it('matches exact supplied labels and preserves unmapped records', () => {
    expect(
      digitalExamples.filter((e) => matchesPlace(e, '~unknown', '')),
    ).toHaveLength(2)
    expect(
      digitalExamples.filter((e) =>
        matchesPlace(e, 'Netherlands', 'Western Europe'),
      ),
    ).toHaveLength(1)
    expect(
      digitalExamples.filter((e) => matchesPlace(e, 'Netherlands', 'Oceania')),
    ).toHaveLength(0)
    expect(
      matchesPlace({ ...digitalExamples[0], country: '' }, 'Netherlands', ''),
    ).toBe(false)
    expect(matchesPlace(digitalExamples[0], 'netherlands', '')).toBe(false)
    expect(
      reportExamples.filter((e) => matchesPlace(e, '~unknown', '')),
    ).toHaveLength(3)
    expect(
      parseFilters(
        serializeFilters({
          ...defaultFilters,
          source: 'usgs',
          region: 'r'.repeat(300),
        }),
      ).region,
    ).toHaveLength(300)
    expect(placeOptions(digitalExamples, 'region')).toContain(
      'Location withheld for safety',
    )
  })
})

describe('explicit fixture relationship evidence', () => {
  it('resolves two authored comparisons to existing compatible fixtures', () => {
    expect(parseRelationships(input, digitalExamples)).toHaveLength(2)
  })
  it('rejects oversized envelopes, unknown fields, unsafe IDs and dangling or self references', () => {
    for (const bad of [
      null,
      Array(51).fill(input[0]),
      [{ ...input[0], url: 'https://invalid.test' }],
      [{ ...input[0], from: '<script>' }],
      [{ ...input[0], to: 'missing-id' }],
      [{ ...input[0], to: input[0].from }],
      [input[0], input[0]],
    ])
      expect(() => parseRelationships(bad, digitalExamples)).toThrow()
  })
  it('rejects real observations, incompatible methods and unsupported causal kinds', () => {
    expect(() =>
      parseRelationships([{ ...input[0], kind: 'caused-by' }], digitalExamples),
    ).toThrow()
    expect(() =>
      parseRelationships(
        [{ ...input[0], to: 'digital-demo-web' }],
        digitalExamples,
      ),
    ).toThrow()
    expect(() =>
      parseRelationships(
        input,
        digitalExamples.map((e) => ({ ...e, is_demo: false })) as never,
      ),
    ).toThrow()
    expect(() =>
      parseRelationships(
        [{ ...input[0], evidence: 'x'.repeat(601) }],
        digitalExamples,
      ),
    ).toThrow()
    expect(() =>
      parseRelationships(
        [{ ...input[0], evidence: 'invalid\u0000 evidence' }],
        digitalExamples,
      ),
    ).toThrow()
  })
  it('derives the version relationship only from a validated supplied correction', () => {
    const event = reportExamples.find((e) => e.correction)!
    expect(correctionRelationship(event)).toMatchObject({
      evidence: event.correction!.note,
      source: event.source_name,
      url: event.source_url,
    })
    expect(
      correctionRelationship(reportExamples.find((e) => !e.correction)!),
    ).toBeNull()
    expect(correctionRelationship(digitalExamples[0])).toBeNull()
  })
})
