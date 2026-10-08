import { expect, test } from '@playwright/test'

// Original invented data only. No digital measurement service is contacted.
test('digital scenarios expose honest measurements, intervals and keyboard details', async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date('2030-01-01T12:00:00Z') })
  await page.goto('/?source=digital-demo&view=list')
  await expect(page.getByRole('status')).toHaveText(
    '3 simulated digital events',
  )
  await expect(
    page.getByText('SIMULATED · Digital world', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Measurement intervals overlapping the past…'),
  ).toBeVisible()
  const card = page.locator('#card-digital-demo-drop')
  await expect(card).toContainText('Interval ended 2h before snapshot')
  await card.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.getByText('SIMULATED · DIGITAL MEASUREMENT', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('40 responsive blocks · baseline 100 · not users', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    dialog.getByText('AS64512 · fictional private-use network'),
  ).toBeVisible()
  await expect(
    dialog.getByText('08 Oct 2026, 14:30 UTC', { exact: true }),
  ).toBeVisible()
  await expect(dialog.getByText('Magnitude / type')).toHaveCount(0)
  await page.screenshot({
    path: `docs/screenshots/phase-6-${info.project.name}-synthetic-digital-detail.png`,
  })
  await page.keyboard.press('Escape')
  await expect(card).toBeFocused()
  await page.locator('#card-digital-demo-web').click()
  await expect(
    dialog.getByText('3 / 12 tests anomalous · not people', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText('Not supplied · not zero', { exact: true }),
  ).toBeVisible()
  await expect(
    dialog.getByText(/An anomaly is not a confirmed outage/),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    '6 simulated digital events',
  )
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    path: `docs/screenshots/phase-6-${info.project.name}-synthetic-digital-list.png`,
    fullPage: true,
  })
  await page.getByRole('button', { name: '6 hours', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('1 simulated digital event')
})

test('digital family/result filters share, restore and reset across sources', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/?source=digital-demo&view=list&hours=168')
  await page
    .getByLabel('Measurement family', { exact: true })
    .selectOption('interference')
  await expect(page.getByRole('status')).toHaveText(
    '3 simulated digital events',
  )
  await page
    .getByLabel('Sample result', { exact: true })
    .selectOption('inconclusive')
  await expect(page.getByRole('status')).toHaveText('1 simulated digital event')
  await page.locator('.event-card').click()
  await expect(
    page
      .getByRole('dialog')
      .getByText('Anomaly count / denominator not supplied'),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Copy view link' }).click()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  expect(url).toContain('digital=interference&result=inconclusive')
  await page.goto(url)
  await expect(page.getByLabel('Sample result')).toHaveValue('inconclusive')
  await page.getByLabel('Sample result').selectOption('no-samples')
  await expect(page.getByRole('status')).toHaveText(
    '0 simulated digital events',
  )
  await expect(
    page.getByText(/No digital examples match these filters/),
  ).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('status')).toHaveText('1 simulated digital event')
  await page
    .getByRole('button', { name: 'Global reports · simulated', exact: true })
    .click()
  expect(page.url()).not.toContain('digital=')
  await expect(page.getByRole('status')).toHaveText('6 simulated report events')
  await page.goBack()
  await expect(page.getByLabel('Sample result')).toHaveValue('inconclusive')
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    '3 simulated digital events',
  )
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('12 simulated events')
})

test('unknown and withheld digital locations stay off both maps', async ({
  page,
}, info) => {
  await page.goto('/?source=digital-demo&hours=168&map=static')
  await expect(
    page.getByRole('button', { name: /^Simulated digital measurement:/ }),
  ).toHaveCount(4)
  await expect(
    page.getByText(/4 broad regional markers · 2 scenarios not mapped/),
  ).toBeVisible()
  for (const id of ['gap', 'unknown']) {
    await page.locator(`#card-digital-demo-${id}`).click()
    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByRole('button', { name: 'Show on map' }),
    ).toHaveCount(0)
    await expect(
      dialog.getByText(
        /Location (not supplied|withheld for safety) · not mapped/,
      ),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Show on map', exact: true }),
    ).toBeDisabled()
  }
  const marker = page.getByRole('button', {
    name: /^Simulated digital measurement: Reachability drop/,
  })
  await marker.click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Show on map' })
    .click()
  await expect(marker).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Find in feed' }).click()
  await expect(page.locator('#card-digital-demo-drop')).toBeFocused()
  await page.getByRole('button', { name: 'Use interactive map' }).click()
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible()
  await expect(page.locator('.map-canvas .event-marker')).toHaveCount(4)
  const interactive = page.locator('.map-canvas .event-marker').first()
  await interactive.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(interactive).toBeFocused()
  await page
    .getByRole('region', { name: 'Event map', exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/screenshots/phase-6-${info.project.name}-synthetic-digital-map.png`,
  })
})

for (const mode of ['view=list', 'map=static']) {
  test(`digital ${mode} is local, map-free and usable offline at 320px`, async ({
    page,
    context,
  }) => {
    const resources: string[] = []
    page.on('request', (r) => resources.push(r.url()))
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto(`/?source=digital-demo&hours=168&${mode}`)
    await expect(page.getByRole('status')).toHaveText(
      '6 simulated digital events',
    )
    await context.setOffline(true)
    await page.getByRole('textbox', { name: 'Search events' }).fill('AS64513')
    await expect(page.getByRole('status')).toHaveText(
      '1 simulated digital event',
    )
    await page
      .getByRole('button', { name: 'Digital world', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText(
      '0 simulated digital events',
    )
    await page
      .getByRole('button', { name: 'Reset filters', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText(
      '3 simulated digital events',
    )
    await page
      .getByText('Coverage, privacy & source research', { exact: true })
      .click()
    await expect(
      page.getByRole('link', { name: 'OONI interpretation guide' }),
    ).toHaveAttribute(
      'href',
      'https://ooni.org/support/interpreting-ooni-data/',
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
