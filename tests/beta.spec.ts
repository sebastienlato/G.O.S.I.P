import { expect, test } from '@playwright/test'

const base = '/G.O.S.I.P/'
const origin = 'https://public.gosip.test'

// Reserved public hostname, served entirely from a strict local static server.
// A localhost browser URL would accidentally exercise the enabled adapters.
const unexpected = new WeakMap<object, string[]>()
test.beforeEach(async ({ context, page }) => {
  const failures: string[] = []
  unexpected.set(page, failures)
  page.on('pageerror', (error) => failures.push(error.message))
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== origin || !url.pathname.startsWith(base)) {
      failures.push(url.href)
      await route.abort()
      return
    }
    const response = await route.fetch({
      url: `http://127.0.0.1:4173${url.pathname}${url.search}`,
    })
    if (!response.ok()) failures.push(`${response.status()} ${url.pathname}`)
    await route.fulfill({ response })
  })
})
test.afterEach(async ({ page }) => {
  expect(unexpected.get(page)).toEqual([])
})

test('repository map loads geography, worker and markers with production CSP', async ({
  page,
}, info) => {
  const resources: string[] = []
  page.on('request', (r) => resources.push(r.url()))
  await page.goto(`${origin}${base}`)
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await expect(page.locator('.map-canvas .event-marker')).toHaveCount(12)
  expect(resources.some((url) => url.endsWith(`${base}world.geojson`))).toBe(
    true,
  )
  expect(resources.some((url) => url.includes('maplibre-gl-worker'))).toBe(true)
  const marker = page.getByRole('button', {
    name: 'Simulated: Forest canopy monitoring, Brazil',
    exact: true,
  })
  await marker.click()
  await expect(page.getByRole('dialog')).toContainText('SIMULATED EVENT')
  await page.keyboard.press('Escape')
  await expect(marker).toBeFocused()
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    path: `docs/screenshots/phase-10-${info.project.name}-beta-map.png`,
    fullPage: true,
  })
  await page.reload()
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible()
})

for (const mode of ['view=list', 'map=static']) {
  test(`repository ${mode} keeps lightweight entry, fixture counts and reload`, async ({
    page,
  }, info) => {
    const resources: string[] = []
    page.on('request', (r) => resources.push(r.url()))
    if (info.project.name === 'mobile')
      await page.setViewportSize({ width: 320, height: 740 })
    for (const [source, count] of [
      ['demo', 18],
      ['fire-demo', 4],
      ['reports-demo', 6],
      ['digital-demo', 6],
      ['space-demo', 4],
      ['aviation-demo', 4],
      ['maritime-demo', 4],
    ] as const) {
      await page.goto(`${origin}${base}?source=${source}&hours=168&${mode}`)
      await expect(page.locator('.event-card')).toHaveCount(count)
      expect(new URL(page.url()).pathname).toBe(base)
      if (mode === 'map=static') {
        await expect(page.getByTestId('static-map')).toBeVisible()
        expect(
          await page
            .locator('img[src$="world.svg"]')
            .evaluate((img) => (img as HTMLImageElement).naturalWidth),
        ).toBeGreaterThan(0)
      }
    }
    await page.reload()
    await expect(page.locator('.event-card')).toHaveCount(4)
    expect(
      resources.filter((url) => /maplibre|world\.geojson/.test(url)),
    ).toEqual([])
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.getByRole('link', { name: 'GOSIP home' }).click()
    await page.screenshot({
      path: `docs/screenshots/phase-10-${info.project.name}-${mode === 'view=list' ? 'list' : 'static'}-beta.png`,
      fullPage: true,
    })
  })
}

test('repository report originals, evidence, copied links and history keep subpath', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin,
  })
  await page.goto(
    `${origin}${base}?source=reports-demo&view=list&reports=corrected`,
  )
  const card = page.locator('.event-card').first()
  await card.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  for (const label of [
    'Open original fixture (plain text)',
    'Read the original fixture evidence',
  ]) {
    const link = dialog.getByRole('link', { name: label })
    await expect(link).toHaveAttribute(
      'href',
      `${base}reports/report-demo-forum.txt`,
    )
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      link.click(),
    ])
    await expect(popup.locator('body')).toContainText('NOT REAL NEWS')
    await popup.close()
  }
  await page.keyboard.press('Escape')
  await expect(card).toBeFocused()
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await page.getByRole('button', { name: 'Copy view link' }).click()
  const shared = await page.evaluate(() => navigator.clipboard.readText())
  expect(new URL(shared).pathname).toBe(base)
  expect(new URL(shared).searchParams.get('reports')).toBe('corrected')
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.locator('.event-card')).toHaveCount(18)
  await page.goBack()
  await expect(page.locator('.event-card')).toHaveCount(1)
  await page.goto(shared)
  await page.reload()
  await expect(page.getByLabel('Report updates')).toHaveValue('corrected')
  expect(new URL(page.url()).pathname).toBe(base)
})

for (const source of ['usgs', 'nws']) {
  test(`repository public ${source} stays disabled through reload and recovery`, async ({
    page,
  }) => {
    await page.goto(
      `${origin}${base}?source=${source}&view=list&enableLive=true`,
    )
    await expect(page.getByLabel('Source access status')).toContainText(
      'Disabled on this host',
    )
    await expect(
      page.getByRole('link', { name: 'Visit official provider' }),
    ).toHaveAttribute(
      'href',
      /^https:\/\/(earthquake\.usgs\.gov|forecast\.weather\.gov)\//,
    )
    await expect(page.locator('.event-card')).toHaveCount(0)
    await page.reload()
    await expect(page.getByLabel('Source access status')).toBeVisible()
    expect(await page.evaluate(() => localStorage.length)).toBe(0)
    await expect(
      page.getByRole('button', { name: /^(Refresh|Retry) (USGS|NWS)$/ }),
    ).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Explore simulated examples', exact: true })
      .click()
    await expect(page.locator('.event-card')).toHaveCount(12)
    expect(new URL(page.url()).pathname).toBe(base)
  })
}

test('repository privacy licenses and keyboard navigation remain usable at 320px', async ({
  page,
  context,
}, info) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto(`${origin}${base}?view=list`)
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
  await expect(dialog).toContainText('Apache-2.0')
  await expect(dialog).toContainText('GitHub Pages logs visitor IP addresses')
  for (const [label, content] of [
    ['GOSIP Apache-2.0 license', 'TERMS AND CONDITIONS'],
    ['GOSIP notice', 'Copyright 2026 GOSIP contributors'],
    ['Bundled dependency notices', 'MIT'],
    ['Natural Earth notice', 'Natural Earth'],
    ['world-atlas notice', 'Copyright'],
  ] as const) {
    const link = dialog.getByRole('link', { name: label })
    expect(await link.getAttribute('href')).toMatch(/^\/G\.O\.S\.I\.P\//)
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      link.click(),
    ])
    await expect(popup.locator('body')).toContainText(content)
    await popup.close()
  }
  await dialog.evaluate((el) => {
    el.scrollTop = 0
  })
  await page.screenshot({
    path: `docs/screenshots/phase-10-${info.project.name}-licensed-privacy.png`,
  })
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  )
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    'content',
    'no-referrer',
  )
  const blocked = await page.evaluate(async () => {
    const violations: string[] = []
    document.addEventListener('securitypolicyviolation', (e) =>
      violations.push(e.violatedDirective),
    )
    const script = document.createElement('script')
    script.textContent = 'document.body.dataset.unsafeScript = "executed"'
    document.body.append(script)
    await fetch('https://blocked.gosip.test/').catch(() => {})
    await new Promise((resolve) => setTimeout(resolve, 50))
    return { violations, executed: document.body.dataset.unsafeScript }
  })
  expect(blocked.executed).toBeUndefined()
  expect(blocked.violations).toContain('script-src-elem')
  expect(blocked.violations).toContain('connect-src')
})
