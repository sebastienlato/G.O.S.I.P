import { expect, test } from '@playwright/test'
import {
  forecast,
  FORECAST_URL,
  period,
  point,
  WEATHER_NOW,
} from './fixtures/weather'
import { NWS_POINT_URL } from '../src/data/weather'
import { USGS_URL } from '../src/data/usgs'
import { feed, quake, TEST_NOW } from './fixtures/usgs'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: WEATHER_NOW })
  await page.route(NWS_POINT_URL, (route) => route.fulfill({ json: point }))
})

test('forecast validity, units, future filters, keyboard details, static map and history', async ({
  page,
}, info) => {
  let requests = 0
  const resources: string[] = []
  page.on('request', (request) => resources.push(request.url()))
  await page.route(FORECAST_URL, (route) => {
    requests++
    return route.fulfill({ json: forecast() })
  })
  await page.goto('/?source=nws&view=list')
  await expect(page.getByRole('status')).toHaveText('2 NWS forecast events')
  await expect(
    page.getByText('NWS forecast loaded · manual refresh'),
  ).toBeVisible()
  await expect(page.getByText('Forecast valid in the next…')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Earth & activity', exact: true }),
  ).toHaveCount(0)
  const first = page.locator('.event-card').first()
  await first.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText('WEATHER FORECAST · NWS', { exact: true }),
  ).toBeVisible()
  await expect(dialog.getByText('42 °F', { exact: true })).toBeVisible()
  await expect(dialog.getByText('30%', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Forecast valid until')).toBeVisible()
  await expect(dialog.getByText('Magnitude / type')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(first).toBeFocused()
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('3 NWS forecast events')
  await page.getByRole('textbox', { name: 'Search events' }).fill('Tonight')
  await expect(page.getByRole('status')).toHaveText('2 NWS forecast events')
  await page.getByRole('button', { name: 'Copy view link' }).click()
  expect(page.url()).toContain('source=nws')
  expect(page.url()).toContain('q=Tonight')
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('18 simulated events')
  await page.goBack()
  await expect(page.getByRole('status')).toHaveText('2 NWS forecast events')
  expect(requests).toBe(1)
  expect(
    resources.filter((url) => /maplibre|world-land|world-borders/.test(url)),
  ).toEqual([])
  await page.getByRole('button', { name: 'Clear search', exact: true }).click()
  await page.getByRole('button', { name: '24 hours', exact: true }).click()
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    animations: 'disabled',
    path: `docs/screenshots/phase-4-${info.project.name}-mocked-weather.png`,
    fullPage: true,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.goto('/?source=nws&map=static')
  await expect(page.getByTestId('static-map')).toBeVisible()
  const marker = page.getByRole('button', {
    name: /^NWS forecast: This Afternoon/,
  })
  await marker.click()
  await dialog.getByRole('button', { name: 'Show on map', exact: true }).click()
  await expect(marker).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: /^NWS forecast:/ }),
  ).toHaveCount(1)
  await expect(page.getByText('Forecast location').first()).toBeVisible()
})

test('fire scenarios retain explicit sensor semantics without external requests', async ({
  page,
}, info) => {
  const external: string[] = []
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1'))
      external.push(request.url())
  })
  await page.goto('/?source=fire-demo&map=static')
  await expect(page.getByRole('status')).toHaveText('2 simulated events')
  await expect(
    page.getByText('SIMULATED · Fire & thermal anomalies'),
  ).toBeVisible()
  await page.locator('.event-card').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('18 MW', { exact: true })).toBeVisible()
  await expect(dialog.getByText('335 K', { exact: true })).toBeVisible()
  await expect(
    dialog.getByText('nominal · not probability of wildfire'),
  ).toBeVisible()
  await expect(
    dialog.getByText('SIMULATED EVENT', { exact: true }),
  ).toBeVisible()
  await expect(dialog.getByText(/no satellite acquired them/)).toBeVisible()
  await dialog.getByText('Synthetic radiative power').scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/screenshots/phase-4-${info.project.name}-synthetic-fire.png`,
    animations: 'disabled',
    fullPage: false,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('4 simulated events')
  await page.getByRole('button', { name: 'Environment', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('0 simulated events')
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('18 simulated events')
  expect(external).toEqual([])
})

for (const failure of ['network', 'malformed', '429'] as const) {
  test(`${failure} weather failure never substitutes examples and manual retry recovers`, async ({
    page,
  }) => {
    let requests = 0
    await page.route(FORECAST_URL, (route) => {
      requests++
      if (requests > 1) return route.fulfill({ json: forecast() })
      return failure === 'network'
        ? route.abort()
        : failure === '429'
          ? route.fulfill({ status: 429, headers: { 'Retry-After': '7200' } })
          : route.fulfill({ json: { properties: { periods: ['bad'] } } })
    })
    await page.goto('/?source=nws&view=list')
    await expect(
      page.getByText('NWS unavailable · no forecast loaded'),
    ).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('0 NWS forecast events')
    await expect(
      page.getByRole('button', { name: 'Retry NWS', exact: true }),
    ).toBeDisabled()
    await expect(
      page.getByRole('button', { name: 'Explore fire simulations' }),
    ).toBeVisible()
    await page.clock.fastForward(failure === '429' ? 7200_000 : 3600_000)
    expect(requests).toBe(1)
    await page.getByRole('button', { name: 'Retry NWS', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('2 NWS forecast events')
    expect(requests).toBe(2)
  })
}

test('weather retains failed snapshots, ages validity, supports missing values and replaces empty data', async ({
  page,
}) => {
  let requests = 0
  await page.route(FORECAST_URL, (route) => {
    requests++
    if (requests === 2) return route.abort()
    return route.fulfill({
      json:
        requests > 2
          ? forecast([])
          : forecast([
              period(-1, {
                temperature: null,
                probabilityOfPrecipitation: null,
                windSpeed: null,
              }),
            ]),
    })
  })
  await page.goto('/?source=nws&view=list')
  await expect(page.getByRole('status')).toHaveText('1 NWS forecast event')
  await page.locator('.event-card').click()
  await expect(
    page.getByRole('dialog').getByText('Not supplied', { exact: true }),
  ).toHaveCount(2)
  await page.keyboard.press('Escape')
  await page.clock.fastForward(3600_000)
  await page.getByRole('button', { name: 'Refresh NWS', exact: true }).click()
  await expect(
    page.getByText('Refresh failed · retained forecast is stale'),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('1 NWS forecast event')
  await page.clock.fastForward(11 * 3600_000)
  await expect(page.getByRole('status')).toHaveText('0 NWS forecast events')
  expect(requests).toBe(2)
  await page.getByRole('button', { name: 'Retry NWS', exact: true }).click()
  await expect(
    page.getByText('STALE · check NWS for a newer forecast'),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('0 NWS forecast events')
  expect(requests).toBe(3)
})

test('weather offline gating does not retry on reconnect; USGS cache and clocks remain isolated', async ({
  page,
  context,
}) => {
  let requests = 0
  await page.route(FORECAST_URL, (route) => {
    requests++
    return route.fulfill({ json: forecast() })
  })
  await page.route(USGS_URL, (route) =>
    route.fulfill({
      json: feed(
        [
          quake('test', {
            time: WEATHER_NOW - 3600_000,
            updated: WEATHER_NOW - 1800_000,
          }),
        ],
        WEATHER_NOW,
      ),
    }),
  )
  await page.goto('/?view=list')
  await context.setOffline(true)
  await page
    .getByRole('button', { name: 'NWS weather · New York', exact: true })
    .click()
  await expect(
    page.getByText('NWS unavailable · no forecast loaded'),
  ).toBeVisible()
  await context.setOffline(false)
  await expect(
    page.getByRole('button', { name: 'Retry NWS', exact: true }),
  ).toBeEnabled()
  expect(requests).toBe(0)
  await page.getByRole('button', { name: 'Retry NWS', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('2 NWS forecast events')
  await page
    .getByRole('button', { name: 'USGS earthquakes', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await page.reload()
  await expect(
    page.getByText('CACHED USGS snapshot · manual refresh'),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  const storageKeys = await page.evaluate(() => Object.keys(localStorage))
  expect(storageKeys.every((key) => key.startsWith('gosip.usgs.'))).toBe(true)
  expect(TEST_NOW).not.toBe(WEATHER_NOW)
})
