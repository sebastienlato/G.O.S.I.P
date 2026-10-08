import { describe, expect, it, vi } from 'vitest'
import {
  createWeatherProvider,
  forecastUrl,
  parseWeather,
  weatherIsStale,
  WEATHER_MAX_BYTES,
  WEATHER_REFRESH_MS,
} from './weather'
import {
  forecast,
  FORECAST_URL,
  period,
  point,
  WEATHER_NOW,
} from '../../tests/fixtures/weather'
import { DEMO_TIME, demoEvents, filterEvents } from './events'
import { fireExamples, parseThermalExamples } from './fire'
import {
  defaultFilters,
  parseFilters,
  serializeFilters,
} from '../state/explorer'

describe('environment data boundaries', () => {
  it('preserves forecast times, units and provenance independently of demo time', () => {
    const snapshot = parseWeather(forecast(), WEATHER_NOW)
    expect(snapshot.events[0]).toMatchObject({
      is_demo: false,
      temperature: 42,
      temperature_unit: 'F',
      precipitation_percent: 30,
      wind: '5 to 10 mph',
    })
    expect(snapshot.events[0].collected_at).toBe(
      new Date(WEATHER_NOW).toISOString(),
    )
    expect(snapshot.events[0].occurred_at).not.toBe(snapshot.updated_at)
    expect(weatherIsStale(snapshot, WEATHER_NOW)).toBe(false)
    expect(weatherIsStale(snapshot, WEATHER_NOW + 6 * WEATHER_REFRESH_MS)).toBe(
      true,
    )
  })
  it('filters overlapping future validity periods and sorts soonest first', () => {
    const data = parseWeather(
      forecast([period(35), period(-1), period(11), period(-24)]),
      WEATHER_NOW,
    ).events
    expect(
      filterEvents(data, '', ['environment'], 24, WEATHER_NOW).map(
        (e) => e.occurred_at,
      ),
    ).toEqual([period(-1).startTime, period(11).startTime])
    expect(
      filterEvents(data, 'manhattan', ['environment'], 168, WEATHER_NOW),
    ).toHaveLength(3)
    expect(filterEvents(data, '', ['physical'], 168, WEATHER_NOW)).toHaveLength(
      0,
    )
    expect(
      filterEvents(data, '', ['environment'], 24, WEATHER_NOW + 72 * 3600_000),
    ).toHaveLength(0)
    expect(filterEvents(data, '', ['environment'], 24, DEMO_TIME)).toHaveLength(
      0,
    )
  })
  it('retains missing values without inventing zero or a unit', () => {
    const data = parseWeather(
      forecast([
        period(-1, {
          temperature: null,
          probabilityOfPrecipitation: null,
          windSpeed: null,
        }),
      ]),
      WEATHER_NOW,
    )
    expect(data.events[0]).toMatchObject({
      temperature: null,
      precipitation_percent: null,
      wind: null,
    })
  })
  it.each([
    { temperature: Infinity },
    { temperatureUnit: 'K' },
    { windSpeed: 'x'.repeat(81) },
    { probabilityOfPrecipitation: { unitCode: 'wmoUnit:mm', value: 5 } },
    { probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 101 } },
    { endTime: period().startTime },
    { startTime: 'bad' },
    { startTime: '2027-02-30T16:00:00Z' },
    { shortForecast: '\u0000bad' },
  ])('rejects malformed forecast fields %j', (patch) => {
    expect(() =>
      parseWeather(forecast([period(-1, patch)]), WEATHER_NOW),
    ).toThrow()
  })
  it('counts bad/duplicate periods, rejects oversized envelopes and all-invalid data', () => {
    expect(
      parseWeather(
        forecast([period(), period(), period(12, { temperatureUnit: 'bad' })]),
        WEATHER_NOW,
      ),
    ).toMatchObject({ rejected: 2 })
    expect(() =>
      parseWeather(forecast(Array(33).fill(period())), WEATHER_NOW),
    ).toThrow()
    expect(() => parseWeather(forecast(), WEATHER_NOW - 600_000)).toThrow()
    expect(parseWeather(forecast([]), WEATHER_NOW).events).toEqual([])
  })
  it.each([
    'https://evil.test/forecast',
    'http://api.weather.gov/gridpoints/OKX/33,42/forecast',
    FORECAST_URL + '?url=other',
    'https://api.weather.gov@evil.test/gridpoints/OKX/33,42/forecast',
    'https://api.weather.gov/alerts/active',
  ])('rejects unsafe point-discovered links %s', (forecast) => {
    expect(() => forecastUrl({ properties: { forecast } })).toThrow()
  })
  it('keeps fire samples separate, labeled and validated; preserves original demo counts', () => {
    expect(fireExamples).toHaveLength(4)
    expect(
      fireExamples.every((e) => e.is_demo && e.category === 'environment'),
    ).toBe(true)
    expect(() =>
      parseThermalExamples([{ ...fireExamples[0], is_demo: false }]),
    ).toThrow()
    expect(() =>
      parseThermalExamples([{ ...fireExamples[0], radiative_power_mw: -1 }]),
    ).toThrow()
    expect(
      filterEvents(fireExamples, '', ['environment'], 24, DEMO_TIME),
    ).toHaveLength(2)
    expect(
      filterEvents(
        demoEvents,
        '',
        ['environment', 'physical', 'digital', 'science', 'civic'],
        24,
        DEMO_TIME,
      ),
    ).toHaveLength(12)
    expect(demoEvents).toHaveLength(18)
  })
  it.each(['nws', 'fire-demo'] as const)(
    'round-trips scoped source %s with filters',
    (source) => {
      const filters = {
        ...defaultFilters,
        source,
        query: 'cloud',
        hours: 72 as const,
      }
      expect(parseFilters(serializeFilters(filters))).toEqual(filters)
    },
  )
})

describe('bounded NWS transport', () => {
  it('resolves point then forecast, shares in-flight loads and enforces hourly manual spacing', async () => {
    let now = WEATHER_NOW
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(point))
      .mockResolvedValueOnce(Response.json(forecast()))
    const provider = createWeatherProvider(fetcher, () => now)
    const first = provider.load()
    expect(provider.load()).toBe(first)
    await expect(first).resolves.toHaveProperty('events.length', 3)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher.mock.calls[1][0]).toBe(FORECAST_URL)
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    })
    await expect(provider.load()).rejects.toThrow('Wait')
    now += WEATHER_REFRESH_MS
    fetcher
      .mockResolvedValueOnce(Response.json(point))
      .mockResolvedValueOnce(Response.json(forecast([])))
    expect((await provider.load()).events).toHaveLength(0)
  })
  it('backs off for exposed Retry-After without queued retry', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response('', { status: 429, headers: { 'Retry-After': '7200' } }),
      )
    const provider = createWeatherProvider(fetcher, () => WEATHER_NOW)
    await expect(provider.load()).rejects.toThrow('429')
    expect(provider.retryAt).toBe(WEATHER_NOW + 7200_000)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('bounds streamed bodies even without Content-Length', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('x'.repeat(WEATHER_MAX_BYTES + 1)))
    await expect(
      createWeatherProvider(fetcher, () => WEATHER_NOW).load(),
    ).rejects.toThrow('too large')
  })
  it('does not fetch an unsafe discovered link', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json({ properties: { forecast: 'https://evil.test' } }),
      )
    await expect(
      createWeatherProvider(fetcher, () => WEATHER_NOW).load(),
    ).rejects.toThrow('invalid forecast')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('aborts a hung request after 12 seconds', async () => {
    vi.useFakeTimers()
    try {
      const fetcher: typeof fetch = (_, init) =>
        new Promise((_, reject) =>
          init?.signal?.addEventListener('abort', () =>
            reject(new Error('aborted')),
          ),
        )
      const result = createWeatherProvider(fetcher, () => WEATHER_NOW).load()
      const assertion = expect(result).rejects.toThrow('timed out')
      await vi.advanceTimersByTimeAsync(12_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })
})
