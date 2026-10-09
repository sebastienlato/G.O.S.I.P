// Original test metadata, never used by production ingestion.
export function launchFixture(now: number) {
  return {
    count: 1,
    results: [
      {
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Test rocket | Science payload',
        net: new Date(now + 48 * 3600000).toISOString(),
        net_precision: { name: 'Minute' },
        last_updated: new Date(now - 3600000).toISOString(),
        status: { id: 1 },
        mission: { type: 'Earth Science' },
        pad: {
          country: { name: 'Test country' },
          location: {
            name: 'Test spaceport',
            celestial_body: { id: 1 },
            longitude: -80.61,
            latitude: 28.61,
          },
        },
      },
    ],
  }
}
