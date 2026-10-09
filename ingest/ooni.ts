import { ingestSource } from './source'
import { object } from '../src/data/dwd'
import {
  count,
  countryName,
  exactKeys,
  ooniWindow,
  parseOoni,
  publishOoni,
  decodeOoni,
  OONI_MAX_BYTES,
} from '../src/data/ooni'
export function extractOoni(input: unknown, now: number) {
  const p = object(input)
  if (
    p.v !== 0 ||
    p.dimension_count !== 1 ||
    !Array.isArray(p.result) ||
    !p.result.length ||
    p.result.length > 250
  )
    throw Error('Invalid aggregate')
  const seen = new Set<string>()
  const rows = p.result
    .map((input) => {
      const r = object(input)
      exactKeys(r, [
        'probe_cc',
        'measurement_count',
        'anomaly_count',
        'confirmed_count',
        'failure_count',
        'ok_count',
      ])
      countryName(r.probe_cc)
      const code = r.probe_cc as string
      if (seen.has(code)) throw Error('Duplicate country')
      seen.add(code)
      const total = count(r.measurement_count, 1)
      if (
        [
          'anomaly_count',
          'confirmed_count',
          'failure_count',
          'ok_count',
        ].reduce((n, k) => n + count(r[k]), 0) !== total
      )
        throw Error('Inconsistent counts')
      return { country_code: code, measurement_count: total }
    })
    .filter((r) => r.measurement_count >= 1000)
    .sort((a, b) => a.country_code.localeCompare(b.country_code))
  return {
    ...ooniWindow(now),
    test_name: 'web_connectivity',
    reported_countries: p.result.length,
    rows,
  }
}
export function ingestOoni(fetcher: typeof fetch = fetch, now = Date.now()) {
  const window = ooniWindow(now)
  const query = new URLSearchParams({
    since: window.interval_start.slice(0, 10),
    until: window.interval_end.slice(0, 10),
    axis_x: 'probe_cc',
    test_name: 'web_connectivity',
  })
  return ingestSource(
    {
      source: 'ooni',
      url: `https://api.ooni.io/api/v1/aggregation?${query}`,
      maxBytes: 100_000,
      publicationMaxBytes: OONI_MAX_BYTES,
      parse: (p, time) => parseOoni(extractOoni(p, time), time),
      validate: () => {},
      publish: publishOoni,
      decode: decodeOoni,
    },
    fetcher,
    now,
  )
}
