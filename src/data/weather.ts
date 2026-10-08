import type { DemoEvent, ExplorerEvent } from './events'

export const NWS_POINT_URL = 'https://api.weather.gov/points/40.7128,-74.0060'
export const NWS_PAGE =
  'https://forecast.weather.gov/MapClick.php?lat=40.7128&lon=-74.0060'
export const WEATHER_REFRESH_MS = 60 * 60_000
export const WEATHER_MAX_BYTES = 100_000
export const WEATHER_COVERAGE =
  'One NWS forecast grid cell near Lower Manhattan, New York, United States; not citywide or global coverage. The marker is the requested forecast location, not a weather station or hazard boundary. Forecasts are predictions, not measurements or official alerts. No alerts are loaded here; check weather.gov for warnings.'
export interface ForecastEvent extends Omit<
  DemoEvent,
  'published_at' | 'status' | 'is_demo' | 'freshness'
> {
  kind: 'forecast'
  is_demo: false
  status: 'forecast'
  freshness: 'retrieved'
  valid_until: string
  updated_at: string
  feed_generated_at: string
  source_url: string
  temperature: number | null
  temperature_unit: 'F' | 'C'
  precipitation_percent: number | null
  wind: string | null
  wind_direction: string | null
}
export const isForecast = (event: ExplorerEvent): event is ForecastEvent =>
  'kind' in event && event.kind === 'forecast'
export interface WeatherSnapshot {
  events: ForecastEvent[]
  generated_at: string
  updated_at: string
  retrieved_at: string
  rejected: number
}
function record(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid object')
  return input as Record<string, unknown>
}
function text(input: unknown, limit = 300): string {
  if (
    typeof input !== 'string' ||
    !input.trim() ||
    input.length > limit ||
    /[\u0000-\u001f\u007f]/.test(input)
  )
    throw new Error('Invalid text')
  return input
}
function timestamp(input: unknown): string {
  const value = text(input, 40)
  if (
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error('Invalid time')
  if (
    new Date(value.slice(0, 19) + 'Z').toISOString().slice(0, 19) !==
    value.slice(0, 19)
  )
    throw new Error('Invalid calendar date')
  return new Date(value).toISOString()
}
function measurement(input: unknown, min: number, max: number): number | null {
  if (input == null) return null
  if (
    typeof input !== 'number' ||
    !Number.isFinite(input) ||
    input < min ||
    input > max
  )
    throw new Error('Invalid measurement')
  return input
}
export function forecastUrl(input: unknown): string {
  const root = record(input)
  const value = text(record(root.properties).forecast)
  // Only the exact forecast endpoint shape; never follow arbitrary feed URLs.
  if (
    !/^https:\/\/api\.weather\.gov\/gridpoints\/[A-Z]{3}\/\d{1,4},\d{1,4}\/forecast$/.test(
      value,
    )
  )
    throw new Error('Invalid forecast URL')
  return value
}
export function parseWeather(input: unknown, now: number): WeatherSnapshot {
  if (!Number.isFinite(now) || now < 0) throw new Error('Invalid clock')
  const root = record(input)
  const p = record(root.properties)
  if (
    root.type !== 'Feature' ||
    !Array.isArray(p.periods) ||
    p.periods.length > 32
  )
    throw new Error('Invalid forecast envelope')
  const generated_at = timestamp(p.generatedAt)
  const updated_at = timestamp(p.updateTime)
  if (
    Date.parse(generated_at) > now + 300_000 ||
    Date.parse(updated_at) > Date.parse(generated_at) + 300_000
  )
    throw new Error('Invalid generation time')
  const retrieved_at = new Date(now).toISOString()
  const events: ForecastEvent[] = []
  const ids = new Set<string>()
  let rejected = 0
  for (const raw of p.periods) {
    try {
      const period = record(raw)
      const start = timestamp(period.startTime)
      const end = timestamp(period.endTime)
      const id = `nws-nyc-${start}`
      if (
        ids.has(id) ||
        Date.parse(end) <= Date.parse(start) ||
        Date.parse(end) - Date.parse(start) > 24 * 3600_000 ||
        Math.abs(Date.parse(start) - Date.parse(generated_at)) > 8 * 86400_000
      )
        throw new Error('Invalid forecast interval')
      if (period.temperatureUnit !== 'F' && period.temperatureUnit !== 'C')
        throw new Error('Invalid temperature unit')
      const probability =
        period.probabilityOfPrecipitation == null
          ? null
          : record(period.probabilityOfPrecipitation)
      if (probability && probability.unitCode !== 'wmoUnit:percent')
        throw new Error('Invalid probability unit')
      const event: ForecastEvent = {
        id,
        kind: 'forecast',
        category: 'environment',
        is_demo: false,
        status: 'forecast',
        freshness: 'retrieved',
        title: `${text(period.name, 80)} · ${text(period.shortForecast, 200)}`,
        summary: text(period.detailedForecast, 4000),
        region: 'Lower Manhattan · New York',
        country: 'United States',
        coordinates: [-74.006, 40.7128],
        occurred_at: start,
        valid_until: end,
        updated_at,
        feed_generated_at: generated_at,
        collected_at: retrieved_at,
        source_name: 'NOAA / National Weather Service',
        source_url: NWS_PAGE,
        coverage_note: WEATHER_COVERAGE,
        temperature: measurement(period.temperature, -150, 150),
        temperature_unit: period.temperatureUnit,
        precipitation_percent: probability
          ? measurement(probability.value, 0, 100)
          : null,
        wind: period.windSpeed == null ? null : text(period.windSpeed, 80),
        wind_direction:
          period.windDirection == null ? null : text(period.windDirection, 30),
      }
      ids.add(id)
      events.push(event)
    } catch {
      rejected++
    }
  }
  if (rejected && !events.length) throw new Error('No valid forecast periods')
  return { events, generated_at, updated_at, retrieved_at, rejected }
}
export function weatherIsStale(
  snapshot: WeatherSnapshot,
  now: number,
): boolean {
  return (
    now -
      Math.min(
        Date.parse(snapshot.updated_at),
        Date.parse(snapshot.generated_at),
        Date.parse(snapshot.retrieved_at),
      ) >
    6 * WEATHER_REFRESH_MS
  )
}

// Independent in-memory provider. No weather data or request state is stored on disk.
export function createWeatherProvider(
  fetcher: typeof fetch = fetch,
  now = Date.now,
) {
  let pending: Promise<WeatherSnapshot> | null = null
  let retryAt = 0
  return {
    get retryAt() {
      return retryAt
    },
    load(): Promise<WeatherSnapshot> {
      if (pending) return pending
      if (now() < retryAt)
        return Promise.reject(new Error('Wait before refreshing NWS.'))
      retryAt = now() + WEATHER_REFRESH_MS
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12_000)
      async function get(url: string): Promise<unknown> {
        const response = await fetcher(url, {
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          redirect: 'error',
          headers: { Accept: 'application/geo+json' },
        })
        if (!response.ok) {
          const header = response.headers.get('Retry-After')
          const delay =
            header && /^\d+$/.test(header)
              ? Number(header) * 1000
              : header
                ? Date.parse(header) - now()
                : 0
          if (Number.isFinite(delay)) retryAt = Math.max(retryAt, now() + delay)
          throw new Error(`NWS request failed (HTTP ${response.status}).`)
        }
        if (Number(response.headers.get('Content-Length')) > WEATHER_MAX_BYTES)
          throw new Error('NWS response too large.')
        const reader = response.body?.getReader()
        if (!reader) throw new Error('NWS response body unavailable.')
        let size = 0
        let body = ''
        const decoder = new TextDecoder('utf-8', { fatal: true })
        try {
          while (true) {
            const chunk = await reader.read()
            if (chunk.done) break
            size += chunk.value.byteLength
            if (size > WEATHER_MAX_BYTES)
              throw new Error('NWS response too large.')
            body += decoder.decode(chunk.value, { stream: true })
          }
          body += decoder.decode()
        } finally {
          await reader.cancel().catch(() => {})
        }
        return JSON.parse(body)
      }
      pending = (async () => {
        try {
          const url = forecastUrl(await get(NWS_POINT_URL))
          return parseWeather(await get(url), now())
        } catch (error) {
          if (controller.signal.aborted)
            throw new Error('NWS request timed out after 12 seconds.')
          if (error instanceof Error && error.message.startsWith('NWS '))
            throw error
          throw new Error(
            'NWS unavailable: network failure or invalid forecast. No synthetic data substituted.',
          )
        } finally {
          controller.abort()
          clearTimeout(timeout)
          pending = null
        }
      })()
      return pending
    },
  }
}
