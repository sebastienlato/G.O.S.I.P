// Original invented source-shaped test input. Never used by production ingestion.
export const dwdFixture = (now: number) => ({
  time: now - 1000,
  copyright: 'Copyright Deutscher Wetterdienst',
  warnings: {
    '100000001': [
      {
        headline: 'Test Warnung vor Wind',
        description: 'Erfundene Warnung nur für Tests.',
        instruction: 'Testhinweis.',
        regionName: 'Testbezirk',
        start: now - 3600000,
        end: now + 3600000,
        level: 2,
        type: 1,
        altitudeStart: null,
        altitudeEnd: null,
      },
    ],
  },
})
export const firmsCSV = (day: string) =>
  `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n10.1234,20.2345,330,0.4,0.5,${day},1200,N20,VIIRS,n,2.0NRT,290,4,D\n10.2234,20.3345,331,0.4,0.5,${day},1201,N20,VIIRS,h,2.0NRT,290,5,D\n`
