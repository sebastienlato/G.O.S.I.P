import { expect, test } from '@playwright/test'

// Original simulations: no test contacts a news provider.
test('reports keep explicit claim semantics, publication windows, correction and keyboard focus', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2030-01-01T12:00:00Z') })
  await page.goto('/?source=reports-demo&view=list')
  await expect(page.getByRole('status')).toHaveText('4 simulated report events')
  await expect(
    page.getByText('SIMULATED · Global reports', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Published before the demo snapshot'),
  ).toBeVisible()
  const card = page.locator('.event-card').first()
  await expect(card).toContainText('Published 3h before snapshot')
  await card.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText('SIMULATED · ATTRIBUTED CLAIM', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('06 Oct 2026, 10:00 UTC', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('08 Oct 2026, 15:00 UTC', { exact: true }),
  ).toBeVisible()
  await expect(dialog.getByText('Magnitude / type')).toHaveCount(0)
  await dialog
    .getByText('Compare the supplied prior version', { exact: true })
    .click()
  await expect(
    dialog.getByText('Fictional desk reports a dialogue on 7 October', {
      exact: true,
    }),
  ).toBeVisible()
  const link = dialog.getByRole('link', {
    name: 'Open original fixture (plain text)',
  })
  await expect(link).toHaveAttribute('href', '/reports/report-demo-forum.txt')
  const source = await page.request.get('/reports/report-demo-forum.txt')
  expect(source.headers()['content-type']).toContain('text/plain')
  expect(await source.text()).toContain('NOT REAL NEWS')
  await dialog
    .getByRole('heading', { name: 'Supplied correction · one prior version' })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/screenshots/phase-5-${info.project.name}-synthetic-correction.png`,
  })
  await page.keyboard.press('Escape')
  await expect(card).toBeFocused()
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('6 simulated report events')
  await page.getByRole('button', { name: '6 hours', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('1 simulated report event')
})

test('language, supplied translation, update filters and shared history remain honest', async ({
  page,
}, info) => {
  await page.goto('/?source=reports-demo&view=list&hours=168')
  await page.getByLabel('Source language', { exact: true }).selectOption('fr')
  await expect(page.getByRole('status')).toHaveText('1 simulated report event')
  await expect(page.locator('.event-card h3')).toHaveAttribute('lang', 'fr')
  await page.locator('.event-card').click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByRole('heading', { name: 'Supplied English translation' }),
  ).toBeVisible()
  await expect(
    dialog.getByText('Not supplied · not inferred from publication'),
  ).toBeVisible()
  await expect(
    dialog.getByText('GOSIP fixture author', { exact: false }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByLabel('Report updates').selectOption('corrected')
  await expect(page.getByRole('status')).toHaveText('0 simulated report events')
  await expect(
    page.getByText(/No report examples match these filters/),
  ).toBeVisible()
  await page.getByLabel('Source language', { exact: true }).selectOption('en')
  await expect(page.getByRole('status')).toHaveText('1 simulated report event')
  await page.getByRole('button', { name: 'Copy view link' }).click()
  expect(page.url()).toContain('lang=en')
  expect(page.url()).toContain('reports=corrected')
  await page.reload()
  await expect(page.getByLabel('Report updates')).toHaveValue('corrected')
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('18 simulated events')
  expect(page.url()).not.toContain('lang=')
  await page.goBack()
  await expect(page.getByRole('status')).toHaveText('1 simulated report event')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('4 simulated report events')
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    path: `docs/screenshots/phase-5-${info.project.name}-synthetic-reports.png`,
    fullPage: true,
  })
  await page.getByLabel('Source language', { exact: true }).selectOption('ar')
  await page.locator('.event-card').click()
  await expect(dialog.locator('#detail-title')).toHaveAttribute('lang', 'ar')
  await expect(dialog.locator('#detail-title')).toHaveAttribute('dir', 'auto')
  await expect(
    dialog.getByText(
      'No translation supplied. Original-language text is shown unchanged.',
    ),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('unknown and withheld reports remain unmapped; regional selection works on static and interactive maps', async ({
  page,
}, info) => {
  await page.goto('/?source=reports-demo&hours=168&map=static')
  await expect(
    page.getByRole('button', { name: /^Simulated report:/ }),
  ).toHaveCount(4)
  await expect(
    page.getByText(/4 broad regional markers · 2 reports not mapped/),
  ).toBeVisible()
  await page
    .getByRole('button', {
      name: 'View Civic coordination claim · location unknown',
      exact: true,
    })
    .click()
  let dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText('Location not supplied · not mapped', { exact: true }),
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Show on map' })).toHaveCount(
    0,
  )
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Show on map', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', {
      name: 'View Humanitarian access claim · location withheld',
      exact: true,
    })
    .click()
  await expect(
    dialog.getByText('Location withheld for safety · not mapped', {
      exact: true,
    }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  const marker = page.getByRole('button', {
    name: /^Simulated report: Forum date/,
  })
  await marker.click()
  await dialog.getByRole('button', { name: 'Show on map', exact: true }).click()
  await expect(marker).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Find in feed' }).click()
  await expect(page.locator('#card-report-demo-forum')).toBeFocused()
  await page.getByRole('button', { name: 'Use interactive map' }).click()
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible()
  await expect(page.locator('.map-canvas .event-marker')).toHaveCount(4)
  await page
    .getByRole('region', { name: 'Event map', exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/screenshots/phase-5-${info.project.name}-synthetic-map.png`,
  })
})

for (const mode of ['view=list', 'map=static']) {
  test(`reports ${mode} stays map-free, local and usable offline at 320px`, async ({
    page,
    context,
  }) => {
    const resources: string[] = []
    page.on('request', (r) => resources.push(r.url()))
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(`/?source=reports-demo&${mode}&hours=168`)
    await expect(page.getByRole('status')).toHaveText(
      '6 simulated report events',
    )
    await context.setOffline(true)
    await page.getByRole('textbox', { name: 'Search events' }).fill('Horizon')
    await expect(page.getByRole('status')).toHaveText(
      '2 simulated report events',
    )
    await page
      .getByRole('button', { name: 'Global affairs', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText(
      '0 simulated report events',
    )
    await page
      .getByRole('button', { name: 'Reset filters', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText(
      '4 simulated report events',
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
  })
}
