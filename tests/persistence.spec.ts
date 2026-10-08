import { expect, test } from '@playwright/test'
import { feed, TEST_NOW } from './fixtures/usgs'
import { parseUSGS, USGS_URL } from '../src/data/usgs'
import {
  CACHE_KEY,
  CADENCE_KEY,
  encodeSnapshot,
  RETENTION_MS,
} from '../src/state/earthquakeCache'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: TEST_NOW })
})

test('reload restores original timestamps, keeps source separation, and clears only saved data', async ({
  page,
}) => {
  let requests = 0
  await page.route(USGS_URL, (route) => {
    requests++
    return route.fulfill({ json: feed() })
  })
  await page.goto('/?source=usgs&view=list')
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  const original = await page.getByText(/Feed generated/).innerText()
  await page.reload()
  await expect(
    page.getByText('CACHED USGS snapshot · manual refresh'),
  ).toBeVisible()
  await expect(page.getByText(/Feed generated/)).toHaveText(original)
  expect(requests).toBe(1)
  await expect(
    page.getByRole('button', { name: 'Refresh USGS', exact: true }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Clear saved USGS cache' }).click()
  await expect(page.getByText(/Saved snapshot cleared/)).toBeVisible()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), CACHE_KEY),
  ).toBeNull()
  expect(
    await page.evaluate((key) => localStorage.getItem(key), CADENCE_KEY),
  ).not.toBeNull()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await page
    .getByRole('button', { name: 'Simulated examples', exact: true })
    .click()
  await expect(page.getByRole('status')).toHaveText('12 simulated events')
  await page.reload()
  await expect(page.getByRole('status')).toHaveText('12 simulated events')
  expect(requests).toBe(1)
})

test('stale restoration remains cached and offline access works in an already loaded app', async ({
  page,
  context,
}, testInfo) => {
  const raw = encodeSnapshot(parseUSGS(feed(), TEST_NOW))
  await page.clock.setSystemTime(TEST_NOW + 16 * 60_000)
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
    key: CACHE_KEY,
    raw,
  })
  let requests = 0
  await page.route(USGS_URL, (route) => {
    requests++
    return route.abort()
  })
  await page.goto('/?source=usgs&map=static')
  await expect(
    page.getByText('STALE · refresh to check for changes'),
  ).toBeVisible()
  await expect(
    page.getByText(/Cached observations · original retrieval time preserved/),
  ).toBeVisible()
  expect(requests).toBe(0)
  await context.setOffline(true)
  await expect(page.getByText(/Offline · refresh paused/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Refresh USGS', exact: true }),
  ).toBeDisabled()
  await page
    .getByRole('button', {
      name: 'USGS observation: M 4.7 · Test ocean region, Test ocean region',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    path: testInfo.outputPath('phase-3-cached-offline-mocked-usgs.png'),
    fullPage: true,
  })
  await context.setOffline(false)
  await expect(
    page.getByRole('button', { name: 'Refresh USGS', exact: true }),
  ).toBeEnabled()
  expect(requests).toBe(0)
  await page.getByRole('button', { name: 'Refresh USGS', exact: true }).click()
  await expect(
    page.getByText('Refresh failed · retained observations are stale'),
  ).toBeVisible()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
})

for (const kind of ['corrupt', 'expired', 'denied', 'full'] as const) {
  test(`${kind} storage leaves observations and demo/list usable`, async ({
    page,
  }) => {
    const raw =
      kind === 'expired'
        ? encodeSnapshot(
            parseUSGS(
              feed([], TEST_NOW - RETENTION_MS),
              TEST_NOW - RETENTION_MS,
            ),
          )
        : '{broken'
    await page.addInitScript(
      ({ kind, key, raw }) => {
        if (kind === 'denied')
          Object.defineProperty(window, 'localStorage', {
            get() {
              throw new Error('denied for test')
            },
          })
        else if (kind === 'full')
          Storage.prototype.setItem = () => {
            throw new DOMException('full for test', 'QuotaExceededError')
          }
        else localStorage.setItem(key, raw)
      },
      { kind, key: CACHE_KEY, raw },
    )
    await page.route(USGS_URL, (route) => route.fulfill({ json: feed() }))
    await page.goto('/?source=usgs&view=list')
    await expect(page.getByRole('status')).toHaveText('1 USGS event')
    if (kind === 'denied' || kind === 'full')
      await expect(
        page.getByText(/could not be saved|Device storage unavailable/),
      ).toBeVisible()
    else
      expect(
        await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).version,
          CACHE_KEY,
        ),
      ).toBe(1)
    await page
      .getByRole('button', { name: 'Simulated examples', exact: true })
      .click()
    await expect(page.getByRole('status')).toHaveText('12 simulated events')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

test('429 Retry-After survives reload and clear; manual retry recovers', async ({
  page,
}) => {
  let requests = 0
  await page.route(USGS_URL, (route) => {
    requests++
    return requests === 2
      ? route.fulfill({
          status: 429,
          headers: { 'Retry-After': '900' },
          body: '',
        })
      : route.fulfill({ json: feed() })
  })
  await page.goto('/?source=usgs&view=list')
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await page.clock.fastForward(61_000)
  await page.getByRole('button', { name: 'Refresh USGS', exact: true }).click()
  await expect(page.getByText(/HTTP 429/)).toBeVisible()
  await page.reload()
  await expect(page.getByText(/HTTP 429/)).toBeVisible()
  await expect(page.getByText(/Cached observations/)).toBeVisible()
  await page.getByRole('button', { name: 'Clear saved USGS cache' }).click()
  await page.reload()
  await expect(page.getByRole('status')).toHaveText('0 USGS events')
  await expect(
    page.getByRole('button', { name: 'Retry USGS', exact: true }),
  ).toBeDisabled()
  expect(requests).toBe(2)
  await page.clock.fastForward(901_000)
  await page.getByRole('button', { name: 'Retry USGS', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  expect(requests).toBe(3)
})

test('tabs share in-flight exclusion, saved responses, cooldown and removals', async ({
  page,
  context,
}) => {
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let requests = 0
  await context.route(USGS_URL, async (route) => {
    requests++
    if (requests === 1) await held
    await route.fulfill({
      json: requests === 1 ? feed() : feed([], TEST_NOW + 61_000),
    })
  })
  await page.goto('/?source=usgs&view=list')
  await expect.poll(() => requests).toBe(1)
  const second = await context.newPage()
  await second.clock.install({ time: TEST_NOW })
  await second.goto('/?source=usgs&view=list')
  await expect(second.getByText(/Another tab is refreshing/)).toBeVisible()
  release()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
  await expect(second.getByRole('status')).toHaveText('1 USGS event')
  await expect(
    second.getByText('CACHED USGS snapshot · manual refresh'),
  ).toBeVisible()
  expect(requests).toBe(1)
  await second.clock.fastForward(61_000)
  await second
    .getByRole('button', { name: 'Refresh USGS', exact: true })
    .click()
  await expect(second.getByRole('status')).toHaveText('0 USGS events')
  await expect(page.getByRole('status')).toHaveText('0 USGS events')
  expect(requests).toBe(2)
  await second.getByRole('button', { name: 'Clear saved USGS cache' }).click()
  await expect(
    page.getByText(/Current observations are held in memory/),
  ).toBeVisible()
})

test('hidden selection pauses initial fetch and never queues a retry', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    }),
  )
  let requests = 0
  await page.route(USGS_URL, (route) => {
    requests++
    return route.fulfill({ json: feed() })
  })
  await page.goto('/?source=usgs&view=list')
  await expect(
    page.getByText(/Refresh paused while offline or this tab is hidden/),
  ).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.fastForward(61_000)
  expect(requests).toBe(0)
  await page.getByRole('button', { name: 'Retry USGS', exact: true }).click()
  await expect(page.getByRole('status')).toHaveText('1 USGS event')
})
