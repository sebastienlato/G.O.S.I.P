import { expect, test } from '@playwright/test'

for (const source of ['usgs', 'nws']) {
  test(`public ${source} links fail closed and retain explicit source selection`, async ({
    page,
  }) => {
    const outside: string[] = []
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname === 'public.gosip.test') {
        const response = await route.fetch({
          url: `http://127.0.0.1:4173${url.pathname}${url.search}`,
        })
        await route.fulfill({ response })
      } else {
        outside.push(url.href)
        await route.abort()
      }
    })
    await page.goto(`https://public.gosip.test/?source=${source}&view=list`)
    await expect(page.getByLabel('Source access status')).toContainText(
      'Disabled on this host',
    )
    await expect(page.getByLabel('Source access status')).toContainText(
      'no data is substituted',
    )
    await expect(page.locator('.event-card')).toHaveCount(0)
    await expect(
      page.getByRole('heading', { name: 'Source disabled on this host' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: source === 'usgs' ? 'USGS earthquakes' : 'NWS weather · New York',
        exact: true,
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByRole('button', { name: /^(Refresh|Retry) (USGS|NWS)$/ }),
    ).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Privacy & source licenses' })
      .click()
    await expect(page.getByRole('dialog')).toContainText(
      'USGS and NWS requests are disabled',
    )
    await page.getByRole('button', { name: 'Close about' }).click()
    await page.reload()
    await expect(page.getByLabel('Source access status')).toBeVisible()
    expect(await page.evaluate(() => localStorage.length)).toBe(0)
    await page
      .getByRole('button', { name: 'Explore simulated examples', exact: true })
      .click()
    await expect(page.locator('.event-card')).toHaveCount(12)
    expect(outside).toEqual([])
  })
}

test('privacy dialog supports keyboard focus, narrow reflow and real license files', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/?view=list')
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('link', { name: 'Skip to event feed' }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#event-feed')).toBeFocused()
  const trigger = page.getByRole('button', {
    name: 'Privacy & source licenses',
  })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(page.getByRole('button', { name: 'Close about' })).toBeFocused()
  await expect(dialog).toContainText('UNLICENSED')
  await expect(dialog).toContainText('browser history and copied links')
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('link', { name: 'USGS terms' })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Close about' })).toBeFocused()
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  )
  for (const path of [
    '/dependency-notices.txt',
    '/MAP_DATA_LICENSE.txt',
    '/WORLD_ATLAS_LICENSE.txt',
  ]) {
    const response = await page.request.get(path)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).not.toContain('text/html')
  }
  await dialog.evaluate((el) => {
    el.scrollTop = 0
  })
  await page.screenshot({
    path: `docs/screenshots/phase-9-${info.project.name}-privacy-320.png`,
  })
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('production policy blocks inline script and unapproved connections, without leaking referrers', async ({
  page,
}) => {
  await page.goto('/?view=list')
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    'content',
    'no-referrer',
  )
  const blocked = await page.evaluate(async () => {
    const violations: string[] = []
    document.addEventListener('securitypolicyviolation', (event) =>
      violations.push(event.violatedDirective),
    )
    const script = document.createElement('script')
    script.textContent = 'document.body.dataset.unsafeScript = "executed"'
    document.body.append(script)
    await fetch('https://unapproved.example.invalid/data').catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 100))
    return { ran: document.body.dataset.unsafeScript, violations }
  })
  expect(blocked.ran).toBeUndefined()
  expect(blocked.violations).toContain('script-src-elem')
  expect(blocked.violations).toContain('connect-src')
  const unsafeLinks = await page
    .locator('a[target="_blank"]')
    .evaluateAll(
      (links) =>
        links.filter(
          (link) => !link.getAttribute('rel')?.includes('noreferrer'),
        ).length,
    )
  expect(unsafeLinks).toBe(0)
})

test('typed search is sanitized before display, sharing and history restoration', async ({
  page,
}) => {
  await page.goto('/?view=list')
  const search = page.getByRole('textbox', {
    name: 'Search events',
    exact: true,
  })
  await search.fill('مرحبا\u202e café\u2066')
  await expect(search).toHaveValue('مرحبا café')
  expect(new URL(page.url()).searchParams.get('q')).toBe('مرحبا café')
  await page.reload()
  await expect(search).toHaveValue('مرحبا café')
})
