import { expect, test } from '@playwright/test'

for (const family of ['space', 'aviation', 'maritime']) {
  const label = family[0].toUpperCase() + family.slice(1)
  test(`${family} has distinct sample, plan and missing coverage details`, async ({
    page,
  }, info) => {
    await page.clock.install({ time: new Date('2030-01-01T12:00:00Z') })
    await page.goto(`/?source=${family}-demo&view=list`)
    await expect(page.getByRole('status')).toHaveText(
      `2 simulated ${family} events`,
    )
    await expect(
      page.getByText(`SIMULATED · ${label}`, { exact: true }),
    ).toBeVisible()
    await expect(page.getByText('Publication · newest first')).toBeVisible()
    const card = page.locator(`#card-${family}-demo-sample`)
    await expect(card).toContainText('Published 2h before snapshot')
    await card.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(
      dialog.getByText('Sample observation cutoff', { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByText('08 Oct 2026, 12:00 UTC · synthetic', { exact: true }),
    ).toBeVisible()
    await expect(
      dialog.getByText('GOSIP fixture authors · original fictional content'),
    ).toBeVisible()
    await expect(
      dialog.getByText('Scenario occurrence', { exact: true }),
    ).toHaveCount(0)
    await page.keyboard.press('Escape')
    await expect(card).toBeFocused()
    await page.locator(`#card-${family}-demo-plan`).click()
    await expect(
      dialog.getByText('Not supplied · no observation asserted'),
    ).toBeVisible()
    await expect(
      dialog.getByText('Planned validity start', { exact: true }),
    ).toBeVisible()
    await expect(dialog.getByText(/18 .* planned, not observed/)).toBeVisible()
    await page.screenshot({
      path: `docs/screenshots/phase-8-${info.project.name}-${family}-plan.png`,
    })
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '7 days', exact: true }).click()
    await expect(page.getByRole('status')).toHaveText(
      `4 simulated ${family} events`,
    )
    await page.locator(`#card-${family}-demo-gap`).click()
    await expect(
      dialog.getByText('Not supplied · missing coverage is not zero activity'),
    ).toBeVisible()
    await expect(
      dialog.getByRole('button', { name: 'Show on map' }),
    ).toHaveCount(0)
    await expect(
      dialog.getByText('Collection gap start', { exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Show on map', exact: true }),
    ).toBeDisabled()
  })
  for (const mode of ['view=list', 'map=static']) {
    test(`${family} ${mode} stays local and usable at 320px`, async ({
      page,
      context,
    }, info) => {
      const requests: string[] = []
      page.on('request', (r) => requests.push(r.url()))
      await page.setViewportSize({ width: 320, height: 800 })
      await page.goto(`/?source=${family}-demo&hours=168&${mode}`)
      await expect(page.getByRole('status')).toHaveText(
        `4 simulated ${family} events`,
      )
      if (mode === 'map=static') {
        await expect(
          page.getByRole('button', {
            name: new RegExp(`^Simulated ${family} example:`),
          }),
        ).toHaveCount(2)
        await expect(
          page.getByText(/2 broad context markers · 2 examples not mapped/),
        ).toBeVisible()
      }
      if (family === 'maritime')
        await page.screenshot({
          path: `docs/screenshots/phase-8-${info.project.name}-maritime-${mode === 'view=list' ? 'list' : 'static'}-320.png`,
          fullPage: true,
        })
      await context.setOffline(true)
      await page.getByRole('textbox', { name: 'Search events' }).fill('planned')
      await expect(page.getByRole('status')).toHaveText(
        `1 simulated ${family} event`,
      )
      await page.getByRole('button', { name: label, exact: true }).click()
      await expect(page.getByRole('status')).toHaveText(
        `0 simulated ${family} events`,
      )
      await page
        .getByRole('button', { name: 'Reset filters', exact: true })
        .click()
      await expect(page.getByRole('status')).toHaveText(
        `2 simulated ${family} events`,
      )
      await page.getByText('Coverage, units & privacy', { exact: true }).click()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      expect(
        requests.filter((url) => !url.startsWith('http://127.0.0.1')),
      ).toEqual([])
      expect(
        requests.filter((url) => /maplibre|world\.geojson/.test(url)),
      ).toEqual([])
      expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([])
    })
  }
}

test('additional sources share places and publication playback with clean source transitions', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.clock.install({ time: new Date('2030-01-01T12:00:00Z') })
  await page.goto('/?source=maritime-demo&view=list&hours=168')
  await page
    .getByLabel('Country context', { exact: true })
    .selectOption('~unknown')
  await expect(page.getByRole('status')).toHaveText(
    '4 simulated maritime events',
  )
  await page
    .getByLabel('Region context', { exact: true })
    .selectOption('South Atlantic')
  await expect(page.getByRole('status')).toHaveText(
    '1 simulated maritime event',
  )
  await page.getByRole('button', { name: '← Back 6h', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    '1 simulated maritime event',
  )
  await expect(page.locator('.event-card')).toContainText(
    'planned, not observed',
  )
  await page.getByRole('button', { name: 'Copy view link' }).click()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  expect(url).toContain('at=2026-10-08T10%3A00%3A00.000Z')
  expect(url).toContain('country=%7Eunknown')
  await page.goto(url)
  await expect(
    page.getByRole('button', { name: 'Play simulation', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Play simulation', exact: true })
    .click()
  await page.locator('.event-card').click()
  await page.clock.runFor(2400)
  expect(page.url()).toBe(url)
  await page.keyboard.press('Escape')
  await page
    .getByRole('button', { name: 'Space · simulated', exact: true })
    .click()
  expect(page.url()).not.toMatch(/at=|country=|region=/)
  await expect(page.getByRole('status')).toHaveText('4 simulated space events')
  await page.goBack()
  await expect(page.getByRole('status')).toHaveText(
    '1 simulated maritime event',
  )
  await expect(
    page.getByRole('button', { name: 'Play simulation', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText(
    '2 simulated maritime events',
  )
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('12 simulated events')
})

test('additional map markers preserve focus and explicit map/feed actions', async ({
  page,
}, info) => {
  await page.goto('/?source=aviation-demo&hours=168&map=static')
  const marker = page.getByRole('button', {
    name: /^Simulated aviation example: Regional flight sample/,
  })
  await marker.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(marker).toBeFocused()
  await page.getByRole('button', { name: 'Show on map', exact: true }).click()
  await expect(marker).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Find in feed', exact: true }).click()
  await expect(page.locator('#card-aviation-demo-sample')).toBeFocused()
  await page
    .getByRole('button', { name: 'Use interactive map', exact: true })
    .click()
  await expect(page.locator('.map-canvas .event-marker')).toHaveCount(2)
  const interactive = page.locator('.map-canvas .event-marker').first()
  await interactive.focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(interactive).toBeFocused()
  await page
    .getByRole('region', { name: 'Event map', exact: true })
    .scrollIntoViewIfNeeded()
  await page.screenshot({
    path: `docs/screenshots/phase-8-${info.project.name}-aviation-map.png`,
  })
})
