// Verify real deployment, never infer success from a push or dispatch.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, devices, expect } from '@playwright/test'
const [site, source] = process.argv.slice(2)
const url = new URL(site)
assert.equal(url.origin, 'https://sebastienlato.github.io')
assert.equal(url.pathname, '/G.O.S.I.P/')
assert.match(source, /^[a-f0-9]{40}$/)
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const imageryHost =
  /^(gibs\.earthdata\.nasa\.gov|([a-z0-9-]+\.)*cesium\.com|([a-z0-9-]+\.)*virtualearth\.net|tile\.googleapis\.com)$/
await mkdir('test-results/live', { recursive: true })
try {
  for (const [name, device] of [
    ['desktop', { viewport: { width: 1440, height: 1000 } }],
    ['mobile', devices['iPhone 13']],
  ]) {
    const context = await browser.newContext(device)
    const failures = []
    let allowImagery = false
    const imageryRequests = []
    await context.route('**/*', async (route) => {
      const request = new URL(route.request().url())
      if (allowImagery && imageryHost.test(request.hostname)) {
        imageryRequests.push(request.hostname)
        return route.continue()
      }
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
      if (
        response.status() >= 400 &&
        !imageryHost.test(new URL(response.url()).hostname)
      )
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
    const sourceHealth = (await health.json()).sources
    assert.deepEqual(
      sourceHealth.find((h) => h.source === 'usgs'),
      body.health,
    )
    const hazardResponse = await context.request.get(
      new URL('data/eonet.json', site).href,
    )
    assert.equal(hazardResponse.status(), 200)
    const hazards = await hazardResponse.json()
    assert.equal(hazards.health.status, 'ok')
    assert(hazards.health.record_count > 0)
    assert.equal(hazards.health.generated_at, null)
    assert(Date.now() - Date.parse(hazards.health.fetched_at) < 45 * 60_000)
    assert.deepEqual(
      sourceHealth.find((h) => h.source === 'eonet'),
      hazards.health,
    )
    const newSources = {}
    for (const key of ['dwd', 'firms', 'news']) {
      const response = await context.request.get(
        new URL(`data/${key}.json`, site).href,
      )
      assert.equal(response.status(), 200)
      const p = await response.json()
      assert.equal(
        p.health.status,
        'ok',
        `${key} must be healthy for this verification`,
      )
      assert(Date.now() - Date.parse(p.health.fetched_at) < 45 * 60_000)
      assert.deepEqual(
        sourceHealth.find((h) => h.source === key),
        p.health,
      )
      if (key === 'dwd')
        assert(Date.now() - Date.parse(p.health.generated_at) < 45 * 60_000)
      if (key === 'firms') {
        assert.equal(p.health.generated_at, null)
        assert.equal(p.snapshot.feed.area, 'world')
        assert(
          Date.parse(p.snapshot.feed.interval_end) -
            Date.parse(p.snapshot.feed.interval_start) ===
            86400_000,
        )
        assert(
          p.snapshot.feed.cells.every(
            (c) =>
              c.length === 3 &&
              Math.abs(c[0] % 2) === 1 &&
              Math.abs(c[1] % 2) === 1,
          ),
        )
      }
      if (key === 'news') {
        assert(
          p.snapshot.feed.every(
            (r) =>
              Date.parse(r.published_at) <=
              Date.parse(p.snapshot.retrieved_at) - 86400_000,
          ),
        )
        assert(
          p.snapshot.feed.every(
            (r) =>
              Object.keys(r).sort().join(',') ===
              'author,published_at,title,url',
          ),
        )
      }
      newSources[key] = p
    }
    for (const mode of ['?view=list', '?map=static', '']) {
      allowImagery = !mode
      await page.goto(site + mode)
      await expect(
        page.getByText('Live USGS earthquakes', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByText('Live EONET global hazards', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByRole('checkbox', { name: /DWD weather/ }),
      ).not.toBeChecked()
      await expect(
        page.getByText('Live Global Voices reports', { exact: true }),
      ).toBeVisible()
      await expect(
        page.getByText('Live FIRMS · global thermal summary', { exact: true }),
      ).toBeVisible()
      await expect(page.locator('.event-card').first()).toBeVisible()
      await expect(page.locator('.demo-banner')).toHaveCount(0)
      if (!mode)
        await expect(
          page.getByText('Interactive map', { exact: true }),
        ).toBeVisible({ timeout: 120000 })
      if (mode === '?map=static')
        await expect(page.getByTestId('static-map')).toBeVisible()
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      )
      if (name === 'desktop' && !mode) {
        const controls = await page.locator('.panel-controls').boundingBox()
        assert(
          controls && controls.y + controls.height < 1000,
          'All layer controls must fit the desktop viewport',
        )
      }
      await expect(
        page.getByRole('button', { name: 'Labels', exact: true }),
      ).toHaveCount(0)
      await page.screenshot({
        path: `test-results/live/${name}-${mode.includes('list') ? 'list' : mode ? 'static' : 'map'}.png`,
        fullPage: true,
      })
    }
    await page.getByRole('checkbox', { name: /FIRMS thermal/ }).uncheck()
    await page
      .locator('.event-card')
      .filter({ has: page.locator('.card-magnitude') })
      .filter({ hasText: 'USGS' })
      .first()
      .click()
    await expect(page.getByRole('dialog')).toContainText(
      'U.S. Geological Survey / ANSS',
    )
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: '7 days', exact: true }).click()
    const quakes = page.getByRole('checkbox', { name: /USGS earthquakes/ })
    const hazardToggle = page.getByRole('checkbox', {
      name: /EONET global hazards/,
    })
    await quakes.uncheck()
    await expect(
      page
        .locator('.event-card')
        .filter({ has: page.locator('.card-magnitude') })
        .filter({ hasText: 'USGS' }),
    ).toHaveCount(0)
    await page
      .locator('.event-card')
      .filter({ hasText: 'NASA EONET' })
      .first()
      .click()
    await expect(page.getByRole('dialog')).toContainText('Latest geometry date')
    await expect(page.getByRole('dialog')).toContainText(
      'Occurrence / publication / update',
    )
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(quakes).not.toBeChecked()
    await expect(hazardToggle).toBeChecked()
    await hazardToggle.uncheck()
    await page.getByRole('checkbox', { name: /DWD weather/ }).uncheck()
    await page.getByRole('checkbox', { name: /FIRMS thermal/ }).uncheck()
    await page
      .getByRole('checkbox', { name: /Global Voices reports/ })
      .uncheck()
    await expect(page.locator('.event-card')).toHaveCount(0)
    await expect(
      page.getByText('All live layers are off', { exact: true }),
    ).toBeVisible()
    await page.getByRole('checkbox', { name: /Global Voices reports/ }).check()
    if (newSources.news.health.record_count) {
      await page.locator('.event-card.kind-news').first().click()
      await expect(page.getByRole('dialog')).toContainText('CC BY 3.0')
      await expect(page.getByRole('dialog')).toContainText(
        'not a verified incident',
      )
      await expect(
        page.getByRole('dialog').getByRole('button', { name: 'Show on map' }),
      ).toHaveCount(0)
      await page.keyboard.press('Escape')
    }
    await page.screenshot({
      path: `test-results/live/${name}-reports.png`,
      fullPage: true,
    })
    await page.getByRole('checkbox', { name: /DWD weather/ }).check()
    if (newSources.dwd.health.record_count) {
      await page.locator('.event-card.kind-warning').first().click()
      await expect(page.getByRole('dialog')).toContainText('CC BY 4.0')
      await expect(
        page.getByRole('dialog').getByRole('button', { name: 'Show on map' }),
      ).toHaveCount(0)
      await page.keyboard.press('Escape')
    }
    await page.getByRole('checkbox', { name: /DWD weather/ }).uncheck()
    await page.getByRole('checkbox', { name: /FIRMS thermal/ }).check()
    if (newSources.firms.health.record_count) {
      await page.locator('.event-card.kind-fire').first().click()
      await expect(page.getByRole('dialog')).toContainText('not distinct fires')
      await expect(page.getByRole('dialog')).toContainText('2° × 2° cell')
      await page.keyboard.press('Escape')
    }
    await page
      .getByRole('link', { name: 'GOSIP home' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/live/${name}-phase15.png`,
      fullPage: true,
    })
    await quakes.check()
    await hazardToggle.check()
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
    assert(
      imageryRequests.length > 0,
      'Interactive globe must request an approved imagery provider',
    )
    assert.deepEqual(failures, [])
    console.log(
      `${name}: DWD ${newSources.dwd.health.record_count} warnings; FIRMS ${newSources.firms.health.record_count} cells for ${newSources.firms.snapshot.feed.interval_end}, generated unknown. New source details and toggles passed.`,
    )
    console.log(
      `${name}: live release ${source}, ${body.health.record_count} USGS records + ${hazards.health.record_count} EONET catalog entries; EONET fetched ${hazards.health.fetched_at}; USGS generated ${body.health.generated_at}, fetched ${body.health.fetched_at}; map/list/static/details/privacy, independent layer toggles, empty/reload and same-origin data with approved globe imagery requests passed.`,
    )
    await context.close()
  }
} finally {
  await browser.close()
}
