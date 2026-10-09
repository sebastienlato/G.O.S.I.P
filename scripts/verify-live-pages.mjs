// Verify real deployment, never infer success from a push or dispatch.
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
    await context.route('**/*', async (route) => {
      const request = new URL(route.request().url())
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
    const data = await context.request.get(new URL('data/usgs.json', site).href)
    const health = await context.request.get(
      new URL('data/health.json', site).href,
    )
    assert.equal(data.status(), 200)
    assert.equal(health.status(), 200)
    const body = await data.json()
    assert.equal(body.health.status, 'ok')
    assert(body.health.record_count > 0)
    assert(Date.now() - Date.parse(body.health.fetched_at) < 45 * 60_000)
    assert(Date.now() - Date.parse(body.health.generated_at) < 45 * 60_000)
    assert.deepEqual((await health.json()).sources[0], body.health)
    for (const mode of ['?view=list', '?map=static', '']) {
      await page.goto(site + mode)
      await expect(
        page.getByText('Live USGS earthquakes', { exact: true }),
      ).toBeVisible()
      await expect(page.locator('.event-card').first()).toBeVisible()
      await expect(page.locator('.demo-banner')).toHaveCount(0)
      if (!mode)
        await expect(
          page.getByText('Interactive map', { exact: true }),
        ).toBeVisible({ timeout: 15000 })
      if (mode === '?map=static')
        await expect(page.getByTestId('static-map')).toBeVisible()
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      await page.screenshot({
        path: `test-results/live/${name}-${mode.includes('list') ? 'list' : mode ? 'static' : 'map'}.png`,
        fullPage: true,
      })
    }
    await page.locator('.event-card').first().click()
    await expect(page.getByRole('dialog')).toContainText(
      'U.S. Geological Survey / ANSS',
    )
    await page.keyboard.press('Escape')
    await page
      .getByRole('button', { name: 'Privacy & source licenses' })
      .click()
    await expect(page.getByRole('dialog')).toContainText(
      'GitHub Pages logs visitor IP addresses',
    )
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(
      page.getByText('Live USGS earthquakes', { exact: true }),
    ).toBeVisible()
    assert.deepEqual(failures, [])
    console.log(
      `${name}: live release ${source}, ${body.health.record_count} real records, generated ${body.health.generated_at}, fetched ${body.health.fetched_at}; map/list/static/details/privacy/reload and same-origin-only requests passed.`,
    )
    await context.close()
  }
} finally {
  await browser.close()
}
