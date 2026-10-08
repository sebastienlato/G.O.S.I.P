// Invoke only after authorized deployment, using the URL returned by Pages API.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices, expect } from '@playwright/test'
const [site, source] = process.argv.slice(2)
const url = new URL(site)
assert.equal(url.origin, 'https://sebastienlato.github.io')
assert.equal(url.pathname, '/G.O.S.I.P/')
assert.match(source, /^[a-f0-9]{40}$/)
const browser = await chromium.launch()
await mkdir('test-results/live', { recursive: true })
try {
  for (const [name, device] of [
    ['desktop', { viewport: { width: 1440, height: 1000 } }],
    ['mobile', devices['iPhone 13']],
  ]) {
    const context = await browser.newContext(device)
    const failures = []
    const requests = []
    await context.route('**/*', async (route) => {
      const request = new URL(route.request().url())
      requests.push(request.href)
      if (
        request.origin !== url.origin ||
        !request.pathname.startsWith(url.pathname)
      ) {
        failures.push(`Unexpected request ${request.href}`)
        await route.abort()
      } else await route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => failures.push(error.message))
    page.on('response', (response) => {
      if (response.status() >= 400)
        failures.push(`${response.status()} ${response.url()}`)
    })
    const release = await context.request.get(
      new URL('release.json', site).href,
    )
    assert.equal(release.status(), 200)
    assert.equal((await release.json()).source_commit, source)
    for (const path of [
      'LICENSE.txt',
      'NOTICE.txt',
      'dependency-notices.txt',
      'MAP_DATA_LICENSE.txt',
      'WORLD_ATLAS_LICENSE.txt',
      'reports/report-demo-forum.txt',
      'favicon.svg',
    ]) {
      const response = await context.request.get(new URL(path, site).href)
      assert.equal(response.status(), 200, path)
      assert(!response.headers()['content-type'].includes('text/html'), path)
    }
    await page.goto(`${site}?source=reports-demo&view=list&reports=corrected`)
    await expect(page.locator('.event-card')).toHaveCount(1)
    await page.reload()
    await expect(page.locator('.event-card')).toHaveCount(1)
    await page.locator('.event-card').click()
    await expect(
      page
        .getByRole('dialog')
        .getByRole('link', { name: 'Open original fixture (plain text)' }),
    ).toHaveAttribute('href', '/G.O.S.I.P/reports/report-demo-forum.txt')
    await page.keyboard.press('Escape')
    assert.equal(
      requests.filter((request) => /maplibre|world\.geojson/.test(request))
        .length,
      0,
    )
    await page.goto(`${site}?map=static`)
    await expect(page.getByTestId('static-map')).toBeVisible()
    await expect(page.locator('.event-card')).toHaveCount(12)
    await expect
      .poll(() =>
        page
          .locator('img[src$="world.svg"]')
          .evaluate((img) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true)
    assert.equal(
      requests.filter((request) => /maplibre|world\.geojson/.test(request))
        .length,
      0,
    )
    await page.goto(site)
    await expect(
      page.getByText('Interactive map', { exact: true }),
    ).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.map-canvas .event-marker')).toHaveCount(12)
    await page
      .getByRole('region', { name: 'Event map', exact: true })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/live/${name}-map.png` })
    for (const provider of ['usgs', 'nws']) {
      await page.goto(`${site}?source=${provider}&view=list`)
      await expect(page.getByLabel('Source access status')).toContainText(
        'Disabled on this host',
      )
      await expect(page.locator('.event-card')).toHaveCount(0)
      assert.equal(await page.evaluate(() => localStorage.length), 0)
    }
    await page
      .getByRole('button', { name: 'Privacy & source licenses' })
      .click()
    await expect(page.getByRole('dialog')).toContainText('Apache-2.0')
    await expect(page.getByRole('dialog')).toContainText(
      'GitHub Pages logs visitor IP addresses',
    )
    await page.keyboard.press('Escape')
    await expect(
      page.getByRole('button', { name: 'Privacy & source licenses' }),
    ).toBeFocused()
    await expect(
      page.locator('meta[http-equiv="Content-Security-Policy"]'),
    ).toHaveAttribute('content', /script-src 'self'/)
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'no-referrer',
    )
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
    assert.deepEqual(failures, [])
    console.log(
      `${name}: actual release SHA, files, report reload, static/interactive map, public source guards, privacy, CSP/referrer and layout passed; no external requests.`,
    )
    await context.close()
  }
} finally {
  await browser.close()
}
