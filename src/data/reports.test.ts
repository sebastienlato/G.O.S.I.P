import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import raw from './reportExamples.json'
import { parseReportExamples, reportExamples, isReport } from './reports'
import {
  DEMO_TIME,
  demoEvents,
  filterEvents,
  hasCoordinates,
  locationMeaning,
} from './events'
import { parseFilters, serializeFilters } from '../state/explorer'

const sample = (patch: Record<string, unknown> = {}) => ({
  ...raw[0],
  ...patch,
})
describe('original report fixture boundary', () => {
  it('keeps six separate reports, four languages and bounded source documents', () => {
    expect(reportExamples).toHaveLength(6)
    expect(new Set(reportExamples.map((e) => e.source_language)).size).toBe(4)
    for (const e of reportExamples) {
      expect(e.is_demo).toBe(true)
      expect(e.status).toBe('attributed-claim')
      const document = readFileSync(`public${e.source_url}`, 'utf8')
      expect(document).toContain('NOT REAL NEWS')
      expect(JSON.parse(document.slice(document.indexOf('{')))).toEqual(e)
    }
    expect(demoEvents).toHaveLength(18)
    expect(
      filterEvents(
        demoEvents,
        '',
        ['environment', 'physical', 'digital', 'science', 'civic'],
        24,
      ),
    ).toHaveLength(12)
  })
  it('rejects invalid envelopes, duplicates, unsafe IDs and disguised live content', () => {
    for (const input of [
      null,
      {},
      Array(51).fill(raw[0]),
      [raw[0], raw[0]],
      [sample({ id: '../file' })],
      [sample({ is_demo: false })],
      [sample({ status: 'verified' })],
      [sample({ kind: 'forecast' })],
    ])
      expect(() => parseReportExamples(input)).toThrow()
    expect(parseReportExamples([])).toEqual([])
  })
  it.each([
    'javascript:alert(1)',
    'https://example.org/news',
    '//evil.test',
    '/reports/report-demo-forum.txt?x=1',
    '/reports/../secret',
    '/reports/report-demo-water.txt',
    'data:text/html,bad',
  ])('rejects untrusted original URL %s', (source_url) => {
    expect(() => parseReportExamples([sample({ source_url })])).toThrow()
  })
  it('preserves missing links, claimed times and updates instead of inferring', () => {
    const [e] = parseReportExamples([
      sample({
        source_url: null,
        occurred_at: null,
        updated_at: null,
        correction: null,
      }),
    ])
    expect(e).toMatchObject({
      source_url: null,
      occurred_at: null,
      updated_at: null,
    })
  })
  it('bounds text, blocks control/bidi spoofing, and retains plain text rather than feed HTML', () => {
    for (const title of ['', 'x'.repeat(241), 'a\u0000b', 'a\u202eb'])
      expect(() => parseReportExamples([sample({ title })])).toThrow()
    const [e] = parseReportExamples([
      sample({ title: '<img src=x onerror=alert(1)>' }),
    ])
    expect(e.title).toBe('<img src=x onerror=alert(1)>') // React renders a string, not markup.
    expect(() =>
      parseReportExamples([sample({ source_language: '__proto__' })]),
    ).toThrow()
  })
  it('rejects impossible dates, timestamps out of order and missing required dates', () => {
    for (const patch of [
      { published_at: '2026-02-30T00:00:00.000Z' },
      { published_at: '2026-10-09T00:00:00.000Z' },
      { occurred_at: '2026-10-10T00:00:00.000Z' },
      { updated_at: '2026-10-01T00:00:00.000Z' },
      { collected_at: null },
    ])
      expect(() => parseReportExamples([sample(patch)])).toThrow()
  })
  it('omits unknown/sensitive positions and rejects false precision or out-of-range coordinates', () => {
    expect(reportExamples.filter(hasCoordinates)).toHaveLength(4)
    expect(locationMeaning(reportExamples[3])).toContain('withheld')
    expect(locationMeaning(reportExamples[5])).toContain('not supplied')
    for (const coordinates of [
      [35.1, 0],
      [185, 0],
      [0, 95],
      [NaN, 0],
      [Infinity, 0],
      [0],
      null,
    ])
      expect(() => parseReportExamples([sample({ coordinates })])).toThrow()
    expect(() =>
      parseReportExamples([sample({ location_precision: 'withheld' })]),
    ).toThrow()
    expect(() =>
      parseReportExamples([sample({ location_precision: 'precise' })]),
    ).toThrow()
  })
  it('accepts only supplied translation metadata and one chronologically earlier correction', () => {
    expect(reportExamples[1].translation?.supplied_by).toContain(
      'fixture author',
    )
    expect(reportExamples[2].translation).toBeNull()
    expect(() =>
      parseReportExamples([sample({ translation: { language: 'en' } })]),
    ).toThrow()
    for (const patch of [
      { updated_at: null },
      {
        correction: {
          ...raw[0].correction,
          previous_updated_at: raw[0].updated_at,
        },
      },
      {
        correction: {
          ...raw[0].correction,
          previous_updated_at: '2026-01-01T00:00:00.000Z',
        },
      },
    ])
      expect(() => parseReportExamples([sample(patch)])).toThrow()
  })
})
describe('report exploration semantics', () => {
  it('uses publication, not correction/claimed occurrence, with an explicit clock', () => {
    expect(
      filterEvents(reportExamples, '', ['civic'], 24, DEMO_TIME),
    ).toHaveLength(4)
    expect(
      filterEvents(reportExamples, '', ['civic'], 168, DEMO_TIME),
    ).toHaveLength(6)
    expect(
      filterEvents(reportExamples, '', ['civic'], 6, DEMO_TIME)[0].id,
    ).toBe('report-demo-forum')
    expect(
      filterEvents(
        reportExamples,
        '',
        ['civic'],
        168,
        DEMO_TIME + 8 * 86400_000,
      ),
    ).toHaveLength(0)
    expect(filterEvents(reportExamples, '', ['environment'], 168)).toHaveLength(
      0,
    )
  })
  it('searches publisher, supplied translation and original text without fabricating translations', () => {
    expect(
      filterEvents(reportExamples, 'Horizon', ['civic'], 168),
    ).toHaveLength(2)
    expect(
      filterEvents(reportExamples, 'water sharing', ['civic'], 168),
    ).toHaveLength(1)
    expect(
      filterEvents(reportExamples, 'Consulta', ['civic'], 168),
    ).toHaveLength(2)
    expect(filterEvents(reportExamples, 'حوار', ['civic'], 168)).toHaveLength(1)
    expect(reportExamples.every(isReport)).toBe(true)
  })
  it('round trips language/correction filters and isolates them from other sources', () => {
    const state = parseFilters(
      '?source=reports-demo&lang=fr&reports=corrected&hours=168&view=list&map=static',
    )
    expect(parseFilters(serializeFilters(state))).toEqual(state)
    expect(state).toMatchObject({
      source: 'reports-demo',
      language: 'fr',
      reportStatus: 'corrected',
    })
    expect(
      parseFilters('?source=reports-demo&lang=xx&reports=verified'),
    ).toMatchObject({ language: 'all', reportStatus: 'all' })
    expect(
      parseFilters('?source=usgs&lang=fr&reports=corrected'),
    ).toMatchObject({ language: 'all', reportStatus: 'all' })
  })
})
