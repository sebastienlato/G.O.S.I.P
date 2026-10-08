import { expect, test } from '@playwright/test'

test('filters, search, details, keyboard dismissal, and list mode', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Global explorer.' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('12 simulated events')
  await page.getByRole('button', { name: '6 hours', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('6 simulated events')
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('18 simulated events')
  await page.getByRole('button', { name: 'Environment', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('13 simulated events')
  await page.getByRole('button', { name: 'All events', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search events' }).fill('Japan')
  await expect(page.getByRole('status')).toHaveText('1 simulated events')
  const card = page.getByRole('button', {
    name: 'View Seismic activity scenario',
    exact: true,
  })
  await card.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText('SIMULATED EVENT', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('GOSIP synthetic fixture collection'),
  ).toBeVisible()
  await expect(dialog.getByText('08 Oct 2026, 16:00 UTC')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(card).toBeFocused()
  await page
    .getByRole('textbox', { name: 'Search events' })
    .fill('no-matching-location')
  await expect(page.getByText('No matching signals')).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('12 simulated events')
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'View Seismic activity scenario' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(errors).toEqual([])
})

test('interactive map renders locally and markers open details', async ({
  page,
}, testInfo) => {
  const external: string[] = []
  page.on('request', (req) => {
    if (
      req.url().startsWith('http') &&
      !req.url().startsWith('http://127.0.0.1:4173')
    )
      external.push(req.url())
  })
  await page.goto('/')
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page
    .getByRole('button', {
      name: 'Simulated: Forest canopy monitoring, Brazil',
      exact: true,
    })
    .click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('heading', { name: 'Forest canopy monitoring' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close event details' }).click()
  await expect(
    page.getByRole('button', {
      name: 'Simulated: Forest canopy monitoring, Brazil',
      exact: true,
    }),
  ).toBeFocused()
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await page
    .getByRole('button', { name: 'Reset map view', exact: true })
    .click()
  expect(external).toEqual([])
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    path: testInfo.outputPath('explorer.png'),
    fullPage: true,
  })
})

test('map-data failure preserves useful static markers and the feed', async ({
  page,
}) => {
  await page.route('**/world.geojson', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByText('Map unavailable · static fallback')).toBeVisible(
    { timeout: 15000 },
  )
  await expect(page.getByTestId('static-map')).toBeVisible()
  await page
    .getByRole('button', {
      name: 'Simulated: Forest canopy monitoring, Brazil',
      exact: true,
    })
    .click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('heading', { name: 'Forest canopy monitoring' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close event details' }).click()
  await expect(page.getByRole('status')).toHaveText('12 simulated events')
})

test('WebGL unavailability and network loss leave local exploration usable', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.startsWith('webgl')) return null
      return original.call(this, type as '2d', ...args)
    } as typeof original
  })
  await page.goto('/')
  await expect(page.getByText('Map unavailable · static fallback')).toBeVisible(
    { timeout: 15000 },
  )
  await context.setOffline(true)
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('18 simulated events')
  await page.getByRole('textbox', { name: 'Search events' }).fill('Antarctica')
  await page
    .getByRole('button', { name: 'View Polar research scenario' })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('small-screen layout, keyboard markers, static mode, and about dialog', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Use static map', exact: true })
    .click()
  await expect(page.getByTestId('static-map')).toBeVisible()
  const marker = page.getByRole('button', {
    name: 'Simulated: Forest canopy monitoring, Brazil',
    exact: true,
  })
  await marker.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(marker).toBeFocused()
  await page.getByRole('button', { name: 'About simulated data' }).click()
  await expect(
    page.getByRole('dialog').getByText('Transparent by design'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close about' }).click()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
