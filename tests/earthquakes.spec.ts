import { expect, test } from '@playwright/test'
import { feed, quake, TEST_NOW } from './fixtures/usgs'
import { USGS_URL } from '../src/data/usgs'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: TEST_NOW })
})

test('USGS success uses current time, source details, map selection and source-aware history', async ({
  page,
}, testInfo) => {
  let requests = 0
  await page.route(USGS_URL, (route) => {
    requests++
    return route.fulfill({
      json: feed([
        quake(),
        quake('older', {
          place: 'Older test region',
          time: TEST_NOW - 48 * 3600_000,
        }),
      ]),
    })
  })
  await page.goto('/?source=usgs&view=list')
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await expect(
    page.getByText('USGS snapshot loaded · manual refresh'),
  ).toBeVisible()
  await expect(page.locator('.event-card')).not.toContainText('SIMULATED')
  await page
    .getByRole('button', {
      name: 'View M 4.7 · Test ocean region',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText('EARTHQUAKE OBSERVATION', { exact: true }),
  ).toBeVisible()
  await expect(dialog.getByText('reviewed', { exact: true })).toBeVisible()
  await expect(dialog.getByText('12.5 km')).toBeVisible()
  await expect(
    dialog.getByRole('link', { name: 'Open USGS event page' }),
  ).toHaveAttribute(
    'href',
    'https://earthquake.usgs.gov/earthquakes/eventpage/test001',
  )
  await dialog.getByRole('button', { name: 'Show on map', exact: true }).click()
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible()
  const marker = page.getByRole('button', {
    name: 'USGS observation: M 4.7 · Test ocean region, Test ocean region',
    exact: true,
  })
  await expect(marker).toHaveAttribute('aria-pressed', 'true')
  await marker.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(marker).toBeFocused()
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('2 USGS events')
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('18 simulated events')
  await page.goBack()
  await expect(page.getByRole('status')).toHaveText('2 USGS events')
  expect(requests).toBe(1)
  await page
    .getByRole('button', { name: 'Use static map', exact: true })
    .click()
  await expect(page.getByTestId('static-map')).toBeVisible()
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    path: testInfo.outputPath('earthquakes.png'),
    fullPage: true,
  })
})

for (const failure of ['network', 'malformed'] as const) {
  test(`${failure} failure exposes retry and explicit simulated fallback; retry recovers`, async ({
    page,
  }) => {
    let requests = 0
    await page.route(USGS_URL, (route) => {
      requests++
      if (requests > 1) return route.fulfill({ json: feed() })
      return failure === 'network'
        ? route.abort()
        : route.fulfill({ json: { features: ['invalid'] } })
    })
    await page.goto('/?source=usgs&map=static')
    await expect(
      page.getByText('USGS unavailable · no observations loaded'),
    ).toBeVisible()
    await expect(page.getByRole('status')).toHaveText('0 USGS events')
    await expect(
      page.getByRole('button', { name: 'Retry USGS', exact: true }),
    ).toBeDisabled()
    await page
      .getByRole('button', { name: 'Explore simulated fallback' })
      .click()
    await expect(page.getByRole('status')).toHaveText('12 simulated events')
    await page
      .getByRole('button', { name: 'USGS earthquakes', exact: true })
      .click()
    expect(requests).toBe(1)
    await page.clock.fastForward(61_000)
    await page.getByRole('button', { name: 'Retry USGS', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText('1 USGS event')
    await page
      .getByRole('button', {
        name: 'USGS observation: M 4.7 · Test ocean region, Test ocean region',
        exact: true,
      })
      .focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeVisible()
  })
}

test('stale snapshots, failed refresh, corrections and removal stay explicit without polling', async ({
  page,
}) => {
  let requests = 0
  await page.route(USGS_URL, (route) => {
    requests++
    if (requests === 2) return route.abort()
    if (requests === 3)
      return route.fulfill({
        json: feed(
          [
            quake('test001', {
              mag: 5.1,
              status: 'automatic',
              updated: TEST_NOW + 16 * 60_000,
            }),
          ],
          TEST_NOW + 16 * 60_000,
        ),
      })
    if (requests === 4)
      return route.fulfill({ json: feed([], TEST_NOW + 18 * 60_000) })
    return route.fulfill({ json: feed() })
  })
  await page.goto('/?source=usgs&view=list')
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await page.clock.fastForward(16 * 60_000)
  await expect(
    page.getByText('STALE · refresh to check for changes'),
  ).toBeVisible()
  expect(requests).toBe(1)
  await page.getByRole('button', { name: 'Refresh USGS', exact: true }).click()
  await expect(
    page.getByText('Refresh failed · retained observations are stale'),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await page.clock.fastForward(61_000)
  await page.getByRole('button', { name: 'Retry USGS', exact: true }).click()
  await expect(
    page.getByRole('button', {
      name: 'View M 5.1 · Test ocean region',
      exact: true,
    }),
  ).toBeVisible()
  await page.clock.fastForward(61_000)
  await page.getByRole('button', { name: 'Refresh USGS', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('0 USGS events')
  await expect(
    page.getByText('USGS snapshot loaded · manual refresh'),
  ).toBeVisible()
})

test('partial validation, missing values, mobile reflow and list/static entry avoid map downloads', async ({
  page,
}) => {
  const mapRequests: string[] = []
  page.on('request', (req) => {
    if (/maplibre|world\.geojson/.test(req.url())) mapRequests.push(req.url())
  })
  const missing = quake('missing', {
    mag: null,
    magType: null,
    status: null,
    updated: null,
  })
  missing.geometry.coordinates[2] = null as unknown as number
  await page.route(USGS_URL, (route) =>
    route.fulfill({
      json: feed([missing, quake('bad', { url: 'javascript:alert(1)' })]),
    }),
  )
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/?source=usgs&view=list')
  await expect(page.getByText(/1 invalid records rejected/)).toBeVisible()
  await page.locator('.event-card').click()
  await expect(
    page.getByRole('dialog').getByText('Not supplied', { exact: true }),
  ).toHaveCount(3)
  await page.keyboard.press('Escape')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.goto('/?source=usgs&map=static')
  await expect(page.getByTestId('static-map')).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  expect(mapRequests).toEqual([])
})
