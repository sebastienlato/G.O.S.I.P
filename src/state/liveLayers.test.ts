import { expect, it } from 'vitest'
import {
  parseFilters,
  serializeFilters,
  defaultFilters,
  categoryKeys,
} from './explorer'
import { parseEONET, isHazard } from '../data/eonet'
import { parseUSGS } from '../data/usgs'
import { filterEvents, eventBadge, eventTime } from '../data/events'
import recorded from '../../tests/fixtures/usgs-recorded.json'
import { eonetFixture } from '../../tests/fixtures/eonet'
it('normalizes independent layer subsets, none, legacy USGS and ignores live state in simulations', () => {
  for (const liveLayers of [
    [],
    ['usgs'],
    ['eonet'],
    ['usgs', 'eonet'],
  ] as const) {
    const state = { ...defaultFilters, liveLayers: [...liveLayers] }
    expect(parseFilters(serializeFilters(state))).toEqual(state)
  }
  expect(parseFilters('?source=usgs').liveLayers).toEqual(['usgs'])
  expect(parseFilters('?live=eonet,eonet,usgs').liveLayers).toEqual([
    'usgs',
    'eonet',
  ])
  expect(parseFilters('?live=evil').liveLayers).toEqual(
    defaultFilters.liveLayers,
  )
  expect(parseFilters('?live=eonet&live=usgs').liveLayers).toEqual(
    defaultFilters.liveLayers,
  )
  expect(serializeFilters(parseFilters('?source=demo&live=eonet'))).toBe(
    '?source=demo',
  )
})
it('combines windows and search using distinct source dates without inferred merging', () => {
  const now = recorded.metadata.generated + 1000
  const hazards = parseEONET(eonetFixture(now), now).events
  const quakes = parseUSGS(recorded, now).events
  const combined = [...quakes, ...hazards]
  expect(filterEvents(combined, '', categoryKeys, 24, now)).toHaveLength(4)
  expect(
    filterEvents(combined, 'volcanoes', categoryKeys, 24, now),
  ).toHaveLength(1)
  expect(filterEvents(combined, '', ['environment'], 24, now)).toHaveLength(1)
  expect(
    filterEvents(combined, '', categoryKeys, 6, now).filter(isHazard),
  ).toHaveLength(1)
  expect(eventTime(hazards[0])).toBe(hazards[0].geometry_at)
  expect(eventBadge(hazards[0])).toBe('CURATED HAZARD · EONET')
  expect(new Set(combined.map((e) => e.id)).size).toBe(5)
})

import { parseNews } from '../data/news'
import { parseOoni, ooniWindow } from '../data/ooni'
import { parseMaritime } from '../data/maritime'
import { extractMaritime } from '../../ingest/maritime'
import { maritimeFixture } from '../../tests/fixtures/maritime'
import { parseLaunches } from '../data/launches'
import { extractLaunches } from '../../ingest/launches'
import { launchFixture } from '../../tests/fixtures/launches'
it('auto includes delayed products and schedules without re-dating or reviving expired records', () => {
  const now = recorded.metadata.generated + 1000
  const news = parseNews(
    [
      {
        title: 'Example report',
        author: 'Test writer',
        url: 'https://globalvoices.org/2026/10/01/test/',
        published_at: new Date(now - 30 * 3600000).toISOString(),
      },
    ],
    now,
  ).events
  const digital = parseOoni(
    {
      ...ooniWindow(now),
      test_name: 'web_connectivity',
      reported_countries: 1,
      rows: [{ country_code: 'CA', measurement_count: 1500 }],
    },
    now,
  ).events
  const maritime = parseMaritime(
    extractMaritime(maritimeFixture(now), now),
    now,
  ).events
  const launches = parseLaunches(
    extractLaunches(launchFixture(now)),
    now,
  ).events
  const delayed = [...news, ...digital, ...maritime, ...launches]
  const original = structuredClone(delayed)
  expect(filterEvents(delayed, '', categoryKeys, 24, now)).toHaveLength(0)
  expect(filterEvents(delayed, '', categoryKeys, 'auto', now)).toHaveLength(
    delayed.length,
  )
  expect(
    filterEvents(delayed, '', categoryKeys, 'auto', now + 31 * 86400000),
  ).toHaveLength(0)
  expect(filterEvents([], '', categoryKeys, 'auto', now)).toEqual([])
  expect(delayed).toEqual(original)
})
