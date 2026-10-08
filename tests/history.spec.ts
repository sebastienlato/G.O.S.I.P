import { expect, test } from '@playwright/test'
import { USGS_URL } from '../src/data/usgs'
import { NWS_POINT_URL } from '../src/data/weather'
import { feed, quake, TEST_NOW } from './fixtures/usgs'
import { forecast, FORECAST_URL, point, WEATHER_NOW } from './fixtures/weather'

test('keyboard scrubbing, stepping and shared history preserve fixture semantics', async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/?source=digital-demo&view=list&hours=6')
  const slider = page.getByRole('slider', { name: /Scrub simulated time/ })
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(slider).toHaveValue('167')
  await expect(page.locator('.history-mode')).toHaveText('SIMULATED PLAYBACK')
  await expect(page.getByRole('status')).toHaveText('1 simulated digital event')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#card-digital-demo-drop')).toContainText(
    'Interval extends to 08 Oct 2026, 14:00 UTC · full fixture totals',
  )
  await page.getByRole('button', { name: 'Copy view link' }).click()
  const shared = await page.evaluate(() => navigator.clipboard.readText())
  expect(shared).toContain('at=2026-10-08T13')
  await page.goto(shared)
  await expect(slider).toHaveValue('165')
  await page.getByRole('button', { name: '← Back 6h' }).click()
  await expect(slider).toHaveValue('159')
  await page.goBack()
  await expect(slider).toHaveValue('165')
  await page
    .getByRole('region', { name: 'History and regional exploration' })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/screenshots/phase-7-${info.project.name}-timeline.png`,
  })
  await page.getByRole('button', { name: 'Return to snapshot' }).click()
  expect(page.url()).not.toContain('at=')
  await expect(slider).toHaveValue('168')
})

test('playback is bounded and pauses for explicit pause, hidden pages, details and source changes', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/?view=list')
  const slider = page.getByRole('slider')
  await page.getByRole('button', { name: 'Play simulation' }).click()
  await expect(slider).toHaveValue('0')
  await page.clock.runFor(1201)
  await expect(slider).toHaveValue('6')
  await page.getByRole('button', { name: 'Pause playback' }).click()
  await page.clock.runFor(2401)
  await expect(slider).toHaveValue('6')
  await page.getByRole('button', { name: 'Play simulation' }).click()
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange')),
  )
  await expect(
    page.getByRole('button', { name: 'Play simulation' }),
  ).toBeVisible()
  await page.clock.runFor(2401)
  await expect(slider).toHaveValue('6')
  await page.getByRole('button', { name: 'Return to snapshot' }).click()
  await page.getByRole('button', { name: '← Back 6h' }).click()
  await page.getByRole('button', { name: 'Play simulation' }).click()
  await page.locator('.event-card').first().click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Play simulation' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Play simulation' }).click()
  await page.clock.runFor(1201)
  await expect(slider).toHaveValue('168')
  await expect(
    page.getByRole('button', { name: 'Play simulation' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Play simulation' }).click()
  await page
    .getByRole('button', { name: 'Fire examples · simulated', exact: true })
    .click()
  await expect(slider).toHaveValue('168')
  await page.clock.runFor(2401)
  await expect(slider).toHaveValue('168')
})

test('reduced motion permits keyboard and step access but prevents automatic playback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?view=list')
  await expect(
    page.getByRole('button', { name: 'Play simulation' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: '← Back 6h' }).click()
  await expect(page.getByRole('slider')).toHaveValue('162')
  await page.getByRole('slider').focus()
  await page.keyboard.press('Home')
  await expect(page.getByRole('slider')).toHaveValue('0')
  await expect(page.getByRole('button', { name: '← Back 6h' })).toBeDisabled()
  await page.keyboard.press('End')
  await expect(page.getByRole('slider')).toHaveValue('168')
})

test('supplied country and region filters preserve unknown locations, reset and browser history', async ({
  page,
}) => {
  await page.goto('/?source=digital-demo&hours=168&map=static')
  await page
    .getByLabel('Country context', { exact: true })
    .selectOption('Netherlands')
  await expect(page.getByRole('status')).toHaveText('1 simulated digital event')
  await page
    .getByLabel('Region context', { exact: true })
    .selectOption('Oceania')
  await expect(page.getByRole('status')).toHaveText(
    '0 simulated digital events',
  )
  await expect(page.getByText(/Try clearing place filters/)).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('status')).toHaveText('1 simulated digital event')
  await page
    .getByLabel('Country context', { exact: true })
    .selectOption('~unknown')
  await expect(page.getByRole('status')).toHaveText(
    '2 simulated digital events',
  )
  await expect(
    page.getByRole('button', { name: /^Simulated digital measurement:/ }),
  ).toHaveCount(0)
  await page.reload()
  await expect(page.getByLabel('Country context', { exact: true })).toHaveValue(
    '~unknown',
  )
  await page.locator('#card-digital-demo-unknown').click()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Show on map' }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Clear place filters' }).click()
  await expect(page.getByRole('status')).toHaveText(
    '6 simulated digital events',
  )
  await page
    .getByLabel('Country context', { exact: true })
    .selectOption('Australia')
  await page
    .getByRole('button', { name: 'Global reports · simulated', exact: true })
    .click()
  await expect(page.getByLabel('Country context', { exact: true })).toHaveValue(
    '',
  )
  await expect(page.getByRole('status')).toHaveText('6 simulated report events')
})

test('relationships expose supplied evidence and safely reveal filtered-out related fixtures', async ({
  page,
}, info) => {
  await page.goto('/?source=digital-demo&view=list&country=Netherlands')
  await page.locator('#card-digital-demo-drop').click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('region', { name: 'Evidence and relationships' }),
  ).toContainText('not a before/after sequence')
  await expect(
    dialog.getByRole('region', { name: 'Evidence and relationships' }),
  ).toContainText('Temporal proximity is not causation')
  await dialog
    .getByRole('region', { name: 'Evidence and relationships' })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/screenshots/phase-7-${info.project.name}-relationships.png`,
  })
  await dialog
    .getByRole('button', {
      name: 'Explore related example: Reachability baseline scenario',
    })
    .click()
  await expect(
    dialog.getByRole('heading', {
      name: 'Reachability baseline scenario',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.getByLabel('Country context', { exact: true })).toHaveValue(
    '',
  )
  expect(page.url()).toContain('hours=168')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Find in feed' }).click()
  await expect(page.locator('#card-digital-demo-baseline')).toBeFocused()
  await page.goto('/?source=reports-demo&view=list&reports=corrected')
  await page.locator('.event-card').click()
  await expect(
    dialog.getByRole('region', { name: 'Evidence and relationships' }),
  ).toContainText('Supplied version relationship')
  await expect(
    dialog.getByRole('link', { name: /Read the original fixture evidence/ }),
  ).toHaveAttribute('href', /\/reports\/report-demo-.*\.txt/)
  await page.keyboard.press('Escape')
  await page.goto('/?view=list')
  await page.locator('.event-card').first().click()
  await expect(
    dialog.getByRole('region', { name: 'Evidence and relationships' }),
  ).toContainText('No evidence-backed relationships supplied')
})

for (const mode of ['view=list', 'map=static']) {
  test(`history ${mode} stays local, map-free and usable offline at 320px`, async ({
    page,
    context,
  }, info) => {
    const resources: string[] = []
    page.on('request', (r) => resources.push(r.url()))
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(`/?source=reports-demo&hours=168&${mode}`)
    await context.setOffline(true)
    await page.getByRole('button', { name: '← Back 6h' }).click()
    await page
      .getByLabel('Country context', { exact: true })
      .selectOption('~unknown')
    await expect(page.getByRole('status')).toHaveText(
      '3 simulated report events',
    )
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    expect(
      resources.filter((url) => !url.startsWith('http://127.0.0.1')),
    ).toEqual([])
    expect(
      resources.filter((url) => /maplibre|world\.geojson/.test(url)),
    ).toEqual([])
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
    if (mode === 'map=static') {
      await page.getByRole('button', { name: 'Clear place filters' }).click()
      const marker = page
        .getByRole('button', { name: /^Simulated report:/ })
        .first()
      await marker.click()
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Show on map' })
        .click()
      await expect(marker).toHaveAttribute('aria-pressed', 'true')
      await page.getByRole('button', { name: 'Find in feed' }).click()
      await expect(page.locator('.event-card.is-selected')).toBeFocused()
    }
    await page
      .getByRole('region', { name: 'History and regional exploration' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `docs/screenshots/phase-7-${info.project.name}-${mode.replace('=', '-')}-320px.png`,
      fullPage: true,
    })
  })
}

test('current sources reject historical cursors without changing requests or time semantics', async ({
  page,
}) => {
  let requests = 0
  await page.clock.install({ time: TEST_NOW })
  await page.route(USGS_URL, (route) => {
    requests++
    return route.fulfill({ json: feed([quake()]) })
  })
  await page.goto('/?source=usgs&view=list&at=2026-10-07T16:00:00.000Z')
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  expect(page.url()).not.toContain('at=')
  await expect(page.getByRole('slider')).toHaveCount(0)
  await expect(
    page.getByText(/The USGS week snapshot and 24-hour local cache/),
  ).toBeVisible()
  await page
    .getByLabel('Country context', { exact: true })
    .selectOption('~unknown')
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await page.clock.runFor(60_001)
  expect(requests).toBe(1)
  await page.clock.setSystemTime(WEATHER_NOW)
  await page.route(NWS_POINT_URL, (route) => route.fulfill({ json: point }))
  await page.route(FORECAST_URL, (route) => route.fulfill({ json: forecast() }))
  await page
    .getByRole('button', { name: 'NWS weather · New York', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('2 NWS forecast events')
  await expect(
    page.getByText(/NWS supplies current forecast validity periods/),
  ).toBeVisible()
  await expect(page.getByText('Forecast valid in the next…')).toBeVisible()
  await expect(page.getByRole('slider')).toHaveCount(0)
})
