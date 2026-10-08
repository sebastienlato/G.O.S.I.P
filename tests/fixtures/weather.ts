// Original invented QA payloads. Never imported by the production app.
export const WEATHER_NOW = Date.parse('2027-01-10T16:00:00Z')
export const FORECAST_URL =
  'https://api.weather.gov/gridpoints/OKX/33,42/forecast'
export const point = { properties: { forecast: FORECAST_URL } }
export function period(offset = -1, patch: Record<string, unknown> = {}) {
  return {
    name: offset < 0 ? 'This Afternoon' : 'Tonight',
    startTime: new Date(WEATHER_NOW + offset * 3600_000).toISOString(),
    endTime: new Date(WEATHER_NOW + (offset + 12) * 3600_000).toISOString(),
    temperature: 42,
    temperatureUnit: 'F',
    probabilityOfPrecipitation: { unitCode: 'wmoUnit:percent', value: 30 },
    windSpeed: '5 to 10 mph',
    windDirection: 'NW',
    shortForecast: 'Test cloudy forecast',
    detailedForecast: 'Invented test forecast text, not real weather.',
    ...patch,
  }
}
export function forecast(periods = [period(), period(11), period(35)]) {
  return {
    type: 'Feature',
    properties: {
      generatedAt: new Date(WEATHER_NOW).toISOString(),
      updateTime: new Date(WEATHER_NOW - 600_000).toISOString(),
      periods,
    },
  }
}
