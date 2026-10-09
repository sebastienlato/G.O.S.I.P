// The web validators remain the fixture authority. Never hand-edit native resources.
import { createServer } from 'vite'
import { readFileSync, writeFileSync } from 'node:fs'
const check = process.argv.includes('--check')
const root = 'native/GOSIP/Core/Sources/GOSIPCore/Resources/'
function output(path, value) {
  const content =
    typeof value === 'string' ? value : JSON.stringify(value) + '\n'
  if (check) {
    if (readFileSync(path, 'utf8') !== content)
      throw new Error(`Native resource drift: ${path}`)
  } else writeFileSync(path, content)
}
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
})
try {
  const e = await server.ssrLoadModule('/src/data/events.ts')
  const f = await server.ssrLoadModule('/src/data/fire.ts')
  const r = await server.ssrLoadModule('/src/data/reports.ts')
  const d = await server.ssrLoadModule('/src/data/digital.ts')
  const a = await server.ssrLoadModule('/src/data/additional.ts')
  const fixtures = Object.assign(
    {},
    ...(await Promise.all(
      ['events', 'fire', 'reports', 'digital', 'additional'].map((name) =>
        server.ssrLoadModule(`/tests/fixtures/legacy/${name}.ts`),
      ),
    )),
  )
  const h = await server.ssrLoadModule('/src/data/history.ts')
  const sources = [
    [
      'demo',
      'Original examples',
      fixtures.demoEvents,
      '18 invented examples across five categories. Not representative of global activity.',
    ],
    ['fire-demo', 'Fire examples', fixtures.fireExamples, f.FIRE_NOTE],
    [
      'reports-demo',
      'Global reports',
      fixtures.reportExamples,
      r.REPORT_COVERAGE,
    ],
    [
      'digital-demo',
      'Digital world',
      fixtures.digitalExamples,
      d.DIGITAL_COVERAGE,
    ],
    ...Object.entries(a.additionalLayers).map(([id, config]) => [
      id,
      config.label,
      fixtures.additionalBySource[id],
      config.caveat,
    ]),
  ]
  const relationships = h.parseRelationships(
    JSON.parse(
      readFileSync('tests/fixtures/legacy/relationships.json', 'utf8'),
    ),
    fixtures.digitalExamples,
  )
  const categories = Object.keys(e.categories)
  const stamp = (v) => (v ? e.formatTimestamp(v) : 'Not supplied')
  const row = (label, value) => ({
    label,
    value: String(value ?? 'Not supplied · not zero'),
  })
  const section = (title, rows) => ({ title, rows })
  function record(event) {
    const report = r.isReport(event),
      digital = d.isDigital(event),
      additional = a.isAdditional(event)
    const time = e.eventTime(event)
    const timeBasis = digital
      ? 'Measurement interval end'
      : report || additional
        ? 'Publication'
        : 'Scenario occurrence'
    const details = []
    if (event.kind === 'thermal')
      details.push(
        section('Invented sensor values', [
          row('Radiative power', `${event.radiative_power_mw} MW`),
          row('Brightness temperature', `${event.brightness_kelvin} K`),
          row(
            'Detection confidence label',
            `${event.confidence} · not probability of wildfire`,
          ),
        ]),
      )
    if (digital)
      details.push(
        section('Synthetic measurement', [
          row('Readout', d.digitalReadout(event)),
          row('Family', d.digitalFamilies[event.family]),
          row('Result', d.digitalResults[event.result]),
          row('Method', event.method),
          row('Aggregation', event.aggregation),
          row('Returned samples / tests', event.sample_count),
          row('Missing samples', event.missing_samples),
          row(
            'Fictional network',
            event.network_asn === null
              ? 'Not supplied'
              : `AS${event.network_asn} · private-use`,
          ),
          row(
            'Interpretation',
            'Counts are not people. Anomalies are not confirmed outages or censorship. Missing samples are not normal connectivity.',
          ),
        ]),
      )
    if (additional)
      details.push(
        section('Synthetic activity', [
          row('Basis', a.additionalBases[event.basis]),
          row('Readout', a.additionalReadout(event)),
          row(
            'Interpretation',
            a.additionalLayers[`${event.family}-demo`].caveat,
          ),
        ]),
      )
    details.push(
      section('Scenario times · UTC', [
        row(`${timeBasis} · window basis`, stamp(time)),
        ...(digital || additional
          ? [
              row(
                additional
                  ? `${a.additionalBases[event.basis]} start`
                  : 'Measurement start',
                stamp(additional ? event.interval_start : event.occurred_at),
              ),
              row('Interval end · exclusive', stamp(event.interval_end)),
            ]
          : []),
        ...(report
          ? [
              row(
                'Claimed occurrence',
                event.occurred_at
                  ? stamp(event.occurred_at)
                  : 'Not supplied · not inferred from publication',
              ),
            ]
          : []),
        ...(additional
          ? [
              row(
                'Sample observation cutoff',
                event.observed_at
                  ? stamp(event.observed_at)
                  : 'Not supplied · no observation asserted',
              ),
            ]
          : []),
        row('Scenario publication', stamp(event.published_at)),
        row('Scenario update', stamp(event.updated_at)),
        row('Scenario retrieval / fixture snapshot', stamp(event.collected_at)),
        ...(digital
          ? [
              row('Baseline start', stamp(event.baseline_start)),
              row('Baseline end · exclusive', stamp(event.baseline_end)),
            ]
          : []),
      ]),
    )
    let original = null
    if (report) {
      details.push(
        section('Original-language report', [
          row('Language', r.reportLanguages[event.source_language]),
          row('Publisher', event.source_name),
          row('Status', 'Fictional attributed claim · not verified'),
        ]),
      )
      details.push(
        section(
          'Supplied translation',
          event.translation
            ? [
                row('Credit', event.translation.supplied_by),
                row('Title', event.translation.title),
                row('Text', event.translation.summary),
              ]
            : [row('Translation', 'Not supplied. No automatic translation.')],
        ),
      )
      details.push(
        section(
          'Supplied correction · one prior version',
          event.correction
            ? [
                row('Evidence', event.correction.note),
                row(
                  'Prior version time',
                  stamp(event.correction.previous_updated_at),
                ),
                row('Prior title', event.correction.previous_title),
                row('Prior text', event.correction.previous_summary),
                row(
                  'Meaning',
                  'Superseded claim, not independent corroboration or complete revision history.',
                ),
              ]
            : [
                row(
                  'Correction',
                  'Not supplied. This does not establish that a report never changed.',
                ),
              ],
        ),
      )
      if (event.source_url) {
        if (event.source_url !== `/reports/${event.id}.txt`)
          throw new Error('Noncanonical original')
        original = readFileSync(`tests/fixtures/legacy/${event.id}.txt`, 'utf8')
      }
    }
    details.push(
      section('Provenance, uncertainty & coverage', [
        row('Source', event.source_name),
        row('Location', e.locationMeaning(event)),
        row(
          'Country context',
          event.country || 'Not supplied · not inferred from mapping',
        ),
        row(
          'Uncertainty',
          event.uncertainty ??
            'Invented example. No measured precision or numerical confidence is supplied.',
        ),
        row('Coverage', event.coverage_note),
      ]),
    )
    const searchText = `${event.title} ${event.summary} ${event.region} ${event.country} ${e.categories[event.category].label} ${additional ? `${event.family} ${a.additionalBases[event.basis]} ${event.unit}` : ''} ${digital ? `${event.source_name} ${event.method} ${d.digitalFamilies[event.family]} ${d.digitalResults[event.result]} ${event.network_asn === null ? '' : `AS${event.network_asn}`}` : ''} ${report ? `${event.source_name} ${event.source_language} ${event.translation?.title ?? ''} ${event.translation?.summary ?? ''}` : ''}`
    return {
      id: event.id,
      title: event.title,
      summary: event.summary,
      category: event.category,
      country: event.country,
      region: event.region,
      coordinates: event.coordinates,
      time,
      timeBasis,
      intervalStart: digital ? event.occurred_at : null,
      intervalEnd: digital || additional ? event.interval_end : null,
      language: report ? event.source_language : null,
      corrected: !!event.correction,
      family: digital ? event.family : null,
      result: digital ? event.result : null,
      badge: e.eventBadge(event),
      searchText,
      details,
      original,
      raw: event,
    }
  }
  output(root + 'fixtures.json', {
    version: 1,
    snapshot: e.DEMO_NOW,
    sources: sources.map(([id, title, events, note]) => ({
      id,
      title,
      note,
      records: events.map(record),
    })),
    relationships,
  })
  // A compact oracle from the actual web filter for every hourly cursor/window/source.
  const parity = sources.map(([source, , events]) => ({
    source,
    cases: Array.from(
      { length: 169 },
      (_, hour) => h.HISTORY_START + hour * h.HOUR,
    ).flatMap((at) =>
      [6, 24, 72, 168].map((hours) => ({
        at: new Date(at).toISOString(),
        hours,
        ids: e.filterEvents(events, '', categories, hours, at).map((v) => v.id),
      })),
    ),
  }))
  output(root + 'parity.json', parity)
  // Shared-link oracle uses the actual web parser/serializer plus source filters.
  const links = await server.ssrLoadModule('/src/state/explorer.ts')
  const queries = [
    '',
    'hours=168&view=list',
    'layers=',
    'layers=physical,science',
    'country=~unknown&hours=168',
    'country=Canada',
    'region=No+supplied+match',
    'q=water&hours=168',
    'q=%D9%85%D9%8A%D8%A7%D9%87',
    'q=a%2Bb+%26+c',
    'lang=fr&reports=corrected&hours=168',
    'lang=ar&hours=168',
    'digital=outage&result=anomaly&hours=168',
    'digital=interference&result=inconclusive&hours=168',
    'result=no-samples&hours=168',
    'result=no-anomaly&hours=168',
    'at=2026-10-01T16%3A00%3A00.000Z',
    'at=2026-10-08T13%3A00%3A00.000Z&hours=6',
    'map=static&selected=ignored&camera=ignored',
  ]
  output(
    root + 'links.json',
    sources.flatMap(([source, , events]) =>
      queries.map((query) => {
        const search = `?source=${source}&${query}`
        const filters = links.parseFilters(search)
        const ids = e
          .filterEvents(
            events,
            filters.query,
            filters.selectedCategories,
            filters.hours,
            filters.cursor ?? e.DEMO_TIME,
          )
          .filter((event) =>
            h.matchesPlace(event, filters.country, filters.region),
          )
          .filter(
            (event) =>
              !r.isReport(event) ||
              ((filters.language === 'all' ||
                event.source_language === filters.language) &&
                (filters.reportStatus === 'all' || !!event.correction)),
          )
          .filter(
            (event) =>
              !d.isDigital(event) ||
              ((filters.digitalFamily === 'all' ||
                event.family === filters.digitalFamily) &&
                (filters.digitalResult === 'all' ||
                  event.result === filters.digitalResult)),
          )
          .map((event) => event.id)
        return {
          search,
          canonical: links.serializeFilters({
            ...filters,
            cursor: filters.cursor ?? e.DEMO_TIME,
            mapMode: 'interactive',
          }),
          ids,
        }
      }),
    ),
  )

  const geo = JSON.parse(readFileSync('public/world.geojson', 'utf8'))
  const rings = geo.features.flatMap(({ geometry }) =>
    (geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : [geometry.coordinates]
    ).flatMap((polygon) => polygon),
  )
  output(root + 'world.json', rings)
  output(
    root + 'notices.txt',
    [
      'LICENSE',
      'NOTICE',
      'public/MAP_DATA_LICENSE.txt',
      'public/WORLD_ATLAS_LICENSE.txt',
    ]
      .map((path) => `${path}\n\n${readFileSync(path, 'utf8')}`)
      .join('\n\n'),
  )
  console.log(
    `${check ? 'Verified' : 'Exported'} 46 canonical fixtures, seven separate sources, 4,732 filter parity cases, 133 view-link cases and local map/notices.`,
  )
} finally {
  await server.close()
}
