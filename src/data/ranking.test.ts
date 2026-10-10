import { expect, it } from 'vitest'
import { filterEvents, rankCompatible, type ExplorerEvent } from './events'
import { parseUSGS } from './usgs'
import { feed, quake, TEST_NOW } from '../../tests/fixtures/usgs'
import { parseDWD } from './dwd'
import { dwdFixture } from '../../tests/fixtures/phase14'
const quakes = parseUSGS(
  feed([
    quake('small', { mag: 3, time: TEST_NOW - 1000, updated: TEST_NOW - 500 }),
    quake('big', { mag: 6, time: TEST_NOW - 5000, updated: TEST_NOW - 500 }),
    quake('unknown', {
      mag: null,
      time: TEST_NOW - 2000,
      updated: TEST_NOW - 500,
    }),
  ]),
  TEST_NOW,
).events
it('ranks supplied earthquake magnitude, missing last, independent of input order', () => {
  for (const records of [quakes, [...quakes].reverse()])
    expect(
      filterEvents(records, '', ['physical'], 24, TEST_NOW).map((e) => e.id),
    ).toEqual(['usgs-big', 'usgs-small', 'usgs-unknown'])
})
it('preserves other-kind slots, ranks DWD supplied level separately and leaves selection IDs intact', () => {
  const warning = parseDWD(dwdFixture(TEST_NOW), TEST_NOW).events[0]
  const a = { ...warning, id: 'dwd-low', level: 1 },
    b = { ...warning, id: 'dwd-high', level: 4 }
  const result = rankCompatible([quakes[0], a, quakes[1], b] as ExplorerEvent[])
  expect(result.map((e) => e.id)).toEqual([
    'usgs-big',
    'dwd-high',
    'usgs-small',
    'dwd-low',
  ])
})
