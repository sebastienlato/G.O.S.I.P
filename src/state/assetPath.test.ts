import { describe, expect, it } from 'vitest'
import { assetPath } from './assetPath'
import { parseReportExamples } from '../data/reports'
import raw from '../../tests/fixtures/legacy/reportExamples.json'

describe('repository asset paths', () => {
  it('prefixes canonical assets once for root and repository hosting', () => {
    for (const path of [
      '/world.svg',
      '/world.geojson',
      '/dependency-notices.txt',
      '/reports/report-demo-forum.txt',
    ]) {
      expect(assetPath(path, '/')).toBe(path)
      expect(assetPath(path, '/G.O.S.I.P/')).toBe(`/G.O.S.I.P${path}`)
    }
  })
  it('rejects external URLs, traversal, query strings and encoded paths', () => {
    for (const path of [
      'https://example.com/a',
      '//example.com/a',
      '/a/../b',
      '/a/./b',
      '/%2e%2e/a',
      '/reports/a.txt?x=1',
      '/a\\b',
      '/a#b',
    ]) {
      expect(() => assetPath(path)).toThrow()
    }
  })
  it('does not relax canonical report validation for a deployment prefix', () => {
    expect(() =>
      parseReportExamples([
        { ...raw[0], source_url: '/G.O.S.I.P/reports/report-demo-forum.txt' },
      ]),
    ).toThrow()
  })
})
