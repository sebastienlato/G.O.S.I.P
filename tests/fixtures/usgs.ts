// Invented transport fixtures for tests only. Never shipped as USGS observations.
export const TEST_NOW = Date.parse('2030-01-10T12:00:00.000Z')
export function quake(
  id = 'test001',
  properties: Record<string, unknown> = {},
) {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [142, 38, 12.5] },
    properties: {
      type: 'earthquake',
      place: 'Test ocean region',
      time: TEST_NOW - 3600_000,
      updated: TEST_NOW - 1800_000,
      mag: 4.7,
      magType: 'mb',
      status: 'reviewed',
      net: 'test',
      code: '001',
      url: `https://earthquake.usgs.gov/earthquakes/eventpage/${id}`,
      ...properties,
    },
  }
}
export function feed(features: unknown[] = [quake()], generated = TEST_NOW) {
  return {
    type: 'FeatureCollection',
    metadata: { generated, status: 200, count: features.length },
    features,
  }
}
