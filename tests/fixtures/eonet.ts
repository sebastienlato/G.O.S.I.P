// Original invented API-shaped inputs, used only in automated tests.
interface TestEvent {
  id: string
  title: string
  closed: string | null
  categories: { id: string }[]
  sources: { id: string; url: string }[]
  geometry: {
    date: string
    type: string
    coordinates: number[] | number[][][]
    magnitudeValue: number | null
    magnitudeUnit: string | null
  }[]
}
export function eonetFixture(now: number): {
  title: string
  events: TestEvent[]
} {
  const event = (id: string, category: string, hours: number) => ({
    id: `EONET_${id}`,
    title: `Test ${category} catalog entry`,
    closed: null,
    categories: [{ id: category }],
    sources: [{ id: 'TEST', url: 'https://example.org/hazard' }],
    geometry: [
      {
        date: new Date(now - hours * 3_600_000).toISOString(),
        type: 'Point',
        coordinates: [20, 10],
        magnitudeValue: null,
        magnitudeUnit: null,
      },
    ],
  })
  const polygon = event('polygon', 'volcanoes', 7)
  return {
    title: 'EONET Events',
    events: [
      event('storm', 'severeStorms', 6),
      {
        ...polygon,
        geometry: [
          {
            ...polygon.geometry[0],
            type: 'Polygon',
            coordinates: [
              [
                [20, 10],
                [21, 10],
                [21, 11],
                [20, 10],
              ],
            ],
          },
        ],
      },
      event('older', 'volcanoes', 200),
    ],
  }
}
