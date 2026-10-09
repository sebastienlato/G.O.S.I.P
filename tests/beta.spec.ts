import type { Archive } from '../src/data/archive'
import { parseMaritime, publishMaritime } from '../src/data/maritime'
import { extractMaritime } from '../ingest/maritime'
import { maritimeFixture } from './fixtures/maritime'
import { parseLaunches, publishLaunches } from '../src/data/launches'
import { extractLaunches } from '../ingest/launches'
import { launchFixture } from './fixtures/launches'
import { parseOoni, publishOoni, ooniWindow } from '../src/data/ooni'
import { parseNews, publishNews } from '../src/data/news'
import { dwdFixture, firmsCSV } from './fixtures/phase14'
import { parseDWD, publishDWD } from '../src/data/dwd'
import { parseFIRMS, publishFIRMS } from '../src/data/firms'
import { aggregateFIRMS, fireDay } from '../ingest/firms'
import { eonetFixture } from './fixtures/eonet'
import { parseEONET, publishEONET } from '../src/data/eonet'
import { expect, test } from '@playwright/test'
import recorded from './fixtures/usgs-recorded.json' with { type: 'json' }
import { parseUSGS } from '../src/data/usgs'
import { publish } from '../src/data/published'
const now = recorded.metadata.generated + 1000
const maritimeSnapshot = parseMaritime(
  extractMaritime(maritimeFixture(now), now),
  now,
)
const maritimePublished = publishMaritime(maritimeSnapshot, {
  source: 'maritime',
  status: 'ok',
  error: null,
  attempted_at: new Date(now).toISOString(),
  fetched_at: maritimeSnapshot.retrieved_at,
  generated_at: null,
  record_count: 3,
})
const snapshot = parseUSGS(recorded, now)
const published = publish(snapshot, {
  source: 'usgs',
  status: 'ok',
  error: null,
  attempted_at: new Date(now).toISOString(),
  fetched_at: snapshot.retrieved_at,
  generated_at: snapshot.generated_at,
  record_count: snapshot.events.length,
})

const hazardSnapshot = parseEONET(eonetFixture(now), now)
const hazardPublished = publishEONET(hazardSnapshot, {
  source: 'eonet',
  status: 'ok',
  error: null,
  attempted_at: new Date(now).toISOString(),
  fetched_at: hazardSnapshot.retrieved_at,
  generated_at: null,
  record_count: hazardSnapshot.events.length,
})

const warningSnapshot = parseDWD(dwdFixture(now), now)
const warningPublished = publishDWD(warningSnapshot, {
  source: 'dwd',
  status: 'ok',
  error: null,
  attempted_at: new Date(now).toISOString(),
  fetched_at: warningSnapshot.retrieved_at,
  generated_at: warningSnapshot.generated_at,
  record_count: 1,
})
const emptyWarnings = publishDWD(
  parseDWD({ ...dwdFixture(now), warnings: {} }, now),
  { ...warningPublished.health, record_count: 0 },
)
const fireSnapshot = parseFIRMS(
  aggregateFIRMS(firmsCSV(fireDay(now)), now),
  now,
)
const firePublished = publishFIRMS(fireSnapshot, {
  source: 'firms',
  status: 'ok',
  error: null,
  attempted_at: new Date(now).toISOString(),
  fetched_at: fireSnapshot.retrieved_at,
  generated_at: null,
  record_count: 1,
})

const newsSnapshot = parseNews(
  [
    {
      title: 'Test world report headline',
      url: 'https://globalvoices.org/2026/10/01/test-world-report/',
      author: 'Test Writer',
      published_at: new Date(now - 30 * 3600000).toISOString(),
    },
  ],
  now,
)
const newsPublished = publishNews(newsSnapshot, {
  source: 'news',
  status: 'ok',
  error: null,
  attempted_at: new Date(now).toISOString(),
  fetched_at: newsSnapshot.retrieved_at,
  generated_at: null,
  record_count: 1,
})

const ooniSnapshot = parseOoni(
  {
    ...ooniWindow(now),
    test_name: 'web_connectivity',
    reported_countries: 2,
    rows: [
      { country_code: 'CA', measurement_count: 2500 },
      { country_code: 'SG', measurement_count: 1200 },
    ],
  },
  now,
)
const ooniPublished = publishOoni(ooniSnapshot, {
  source: 'ooni',
  status: 'ok',
  error: null,
  attempted_at: ooniSnapshot.retrieved_at,
  fetched_at: ooniSnapshot.retrieved_at,
  generated_at: null,
  record_count: 2,
})

const launchSnapshot = parseLaunches(extractLaunches(launchFixture(now)), now)
const launchPublished = publishLaunches(launchSnapshot, {
  source: 'launches',
  status: 'ok',
  error: null,
  generated_at: null,
  attempted_at: launchSnapshot.retrieved_at,
  fetched_at: launchSnapshot.retrieved_at,
  record_count: 1,
})
// Synthetic transport captures are test-only; production collects public releases.
const prior = structuredClone(recorded)
prior.metadata.generated -= 86400000
for (const f of prior.features) {
  f.properties.time -= 86400000
  if (f.properties.updated) f.properties.updated -= 86400000
  f.properties.place = 'Earlier captured test region'
}
const priorSnapshot = parseUSGS(prior, now - 86400000)
const priorPublished = publish(priorSnapshot, {
  ...published.health,
  attempted_at: priorSnapshot.retrieved_at,
  fetched_at: priorSnapshot.retrieved_at,
  generated_at: priorSnapshot.generated_at,
})
const archivePublished: Archive = {
  version: 1,
  attempted_at: new Date(now).toISOString(),
  status: 'ok',
  error: null,
  continuity_since: new Date(now - 86400000).toISOString(),
  captures: [now - 86400000, now].map((at, index) => ({
    captured_at: new Date(at).toISOString(),
    release: {
      source_commit: 'a'.repeat(40),
      event: 'push',
      run_id: '123',
      built_at: new Date(at).toISOString(),
    },
    sources: {
      usgs: index ? published : priorPublished,
      eonet: index ? hazardPublished : null,
    },
  })),
}
const base = '/G.O.S.I.P/'
const imageryHost =
  /^(gibs\.earthdata\.nasa\.gov|([a-z0-9-]+\.)*cesium\.com|([a-z0-9-]+\.)*virtualearth\.net|tile\.googleapis\.com)$/
const origin = 'https://public.gosip.test'

// Reserved public hostname, served entirely from a strict local static server.
// A localhost browser URL would accidentally exercise the enabled adapters.
const unexpected = new WeakMap<object, string[]>()
test.beforeEach(async ({ context, page }) => {
  await page.clock.setFixedTime(now)
  const failures: string[] = []
  unexpected.set(page, failures)
  page.on('pageerror', (error) => failures.push(error.message))
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    // Globe imagery/terrain providers are expected third parties (D52); tests
    // stay offline, so they are refused without counting as unexpected.
    if (imageryHost.test(url.hostname)) {
      await route.abort()
      return
    }
    if (url.origin !== origin || !url.pathname.startsWith(base)) {
      failures.push(url.href)
      await route.abort()
      return
    }
    if (url.pathname.endsWith('/data/history.json')) {
      await route.fulfill({ json: archivePublished })
      return
    }
    if (url.pathname.endsWith('/data/maritime.json')) {
      await route.fulfill({ json: maritimePublished })
      return
    }
    if (url.pathname.endsWith('/data/launches.json')) {
      await route.fulfill({ json: launchPublished })
      return
    }
    if (url.pathname.endsWith('/data/ooni.json')) {
      await route.fulfill({ json: ooniPublished })
      return
    }
    if (url.pathname.endsWith('/data/news.json')) {
      await route.fulfill({ json: newsPublished })
      return
    }
    if (url.pathname.endsWith('/data/dwd.json')) {
      await route.fulfill({ json: emptyWarnings })
      return
    }
    if (url.pathname.endsWith('/data/firms.json')) {
      await route.fulfill({ json: firePublished })
      return
    }
    if (url.pathname.endsWith('/data/eonet.json')) {
      await route.fulfill({ json: hazardPublished })
      return
    }
    if (url.pathname.endsWith('/data/usgs.json')) {
      await route.fulfill({ json: published })
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
  // WebGL globe start-up is slow on software renderers (GPU-less CI).
  test.setTimeout(120_000)
  const resources: string[] = []
  page.on('request', (r) => resources.push(r.url()))
  await page.goto(`${origin}${base}`)
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  // Point records are accessible DOM markers; thermal cells are drawn on
  // the globe surface and reached through the feed.
  const points = page.locator('.event-card[data-mapped="true"]:not(.kind-fire)')
  await expect(points.first()).toBeVisible()
  await expect
    .poll(async () =>
      [
        await page.locator('.map-canvas .event-marker').count(),
        await points.count(),
      ].join('/'),
    )
    .toBe('3/3')
  expect(
    resources.some((url) =>
      url.includes(`${base}cesium/Assets/Textures/NaturalEarthII/`),
    ),
  ).toBe(true)
  await expect(
    page.getByRole('button', { name: 'NASA today', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: 'Labels', exact: true }),
  ).toHaveCount(0)
  expect(
    resources.some((url) => url.includes('gibs.earthdata.nasa.gov/')),
  ).toBe(true)
  expect(resources.some((url) => url.includes('arcgisonline.com'))).toBe(false)
  // Markers on the far side of the globe are hidden; use one in view.
  const marker = page
    .locator('.map-canvas .event-marker')
    .filter({ visible: true })
    .first()
  const markerId = await marker.getAttribute('data-event-id')
  const label = (await marker.getAttribute('aria-label'))!.split(': ')[1]
  await marker.click()
  await expect(page.getByRole('dialog')).toContainText(label.split(',')[0])
  await page.keyboard.press('Escape')
  await expect(
    page.locator(`.map-canvas .event-marker[data-event-id="${markerId}"]`),
  ).toBeFocused()
  await page.getByRole('link', { name: 'GOSIP home' }).click()
  await page.screenshot({
    path: `test-results/phase-13-${info.project.name}-beta-map.png`,
    fullPage: true,
  })
  await page.reload()
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible()
})

for (const mode of ['view=list', 'map=static']) {
  test(`repository ${mode} keeps lightweight entry, retired link migration and reload`, async ({
    page,
  }, info) => {
    const resources: string[] = []
    page.on('request', (r) => resources.push(r.url()))
    if (info.project.name === 'mobile')
      await page.setViewportSize({ width: 320, height: 740 })
    for (const [source, count] of [
      ['demo', 5],
      ['digital-demo', 2],
      ['space-demo', 1],
      ['aviation-demo', 0],
      ['maritime-demo', 3],
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
    await expect(page.locator('.event-card')).toHaveCount(3)
    expect(
      resources.filter((url) => /\/cesium\/|\/assets\/engine-/.test(url)),
    ).toEqual([])
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page.getByRole('link', { name: 'GOSIP home' }).click()
    await page.screenshot({
      path: `test-results/phase-13-${info.project.name}-${mode === 'view=list' ? 'list' : 'static'}-beta.png`,
      fullPage: true,
    })
  })
}

test('real reports replace old lab links and preserve attribution, delays and same-origin failures', async ({
  page,
  context,
}) => {
  await page.goto(`${origin}${base}?source=reports-demo&view=list`)
  await expect(page.locator('.event-card.kind-news')).toHaveCount(1)
  await expect(
    page.getByRole('checkbox', { name: 'Global Voices reports' }),
  ).toBeChecked()
  await page.locator('.event-card.kind-news').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Test Writer')
  await expect(dialog).toContainText('not a verified incident')
  await expect(dialog).toContainText('Not supplied')
  await expect(dialog).toContainText('CC BY 3.0')
  await expect(
    dialog.getByRole('link', { name: 'Original Global Voices report' }),
  ).toHaveAttribute('href', newsSnapshot.events[0].source_url)
  await expect(dialog.getByRole('button', { name: 'Show on map' })).toHaveCount(
    0,
  )
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '24 hours', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.getByRole('button', { name: '3 days', exact: true }).click()
  await context.route('**/data/news.json', (route) =>
    route.fulfill({
      json: {
        ...newsPublished,
        snapshot: null,
        health: {
          ...newsPublished.health,
          status: 'failed',
          record_count: 0,
          fetched_at: null,
          error: 'News request failed.',
        },
      },
    }),
  )
  await page.clock.setFixedTime(now + 61_000)
  await page
    .getByText('Reports freshness & source details', { exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Refresh reports', exact: true })
    .click()
  await expect(
    page.getByText('STALE · last available reports', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card.kind-news')).toHaveCount(1)
  await page.reload()
  await expect(
    page.getByText('Global Voices unavailable', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(0)
})

for (const source of ['nws']) {
  test(`repository public ${source} stays disabled through reload and recovery`, async ({
    page,
  }) => {
    await page.goto(
      `${origin}${base}?source=${source}&view=list&enableLive=true`,
    )
    await expect(
      page.getByRole('heading', { name: 'Broader weather · Coming' }),
    ).toBeVisible()
    await expect(page.locator('.event-card')).toHaveCount(0)
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Broader weather · Coming' }),
    ).toBeVisible()
    expect(await page.evaluate(() => localStorage.length)).toBe(0)
    await expect(
      page.getByRole('button', { name: /NWS|simulated/i }),
    ).toHaveCount(0)
    await page.getByRole('checkbox', { name: 'USGS earthquakes' }).check()
    await expect(page.locator('.event-card')).toHaveCount(2)
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
    path: `test-results/phase-13-${info.project.name}-licensed-privacy.png`,
  })
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  )
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    'content',
    'strict-origin',
  )
  // Outgoing links never send a referrer.
  for (const rel of await page
    .locator('a[target="_blank"]')
    .evaluateAll((links) => links.map((a) => a.getAttribute('rel') ?? '')))
    expect(rel).toContain('noreferrer')
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

for (const mode of ['view=list', 'map=static']) {
  test(`live default ${mode} uses same-origin data, details and real clock`, async ({
    page,
  }) => {
    await page.goto(`${origin}${base}?${mode}`)
    await expect(
      page.getByRole('checkbox', { name: /DWD weather/ }),
    ).not.toBeChecked()
    await expect(page.locator('.event-card')).toHaveCount(5)
    await expect(page.locator('.clock')).toContainText('Live view clock')
    await expect(
      page.getByText('Live USGS earthquakes', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: 'Other examples · simulated',
        exact: true,
      }),
    ).not.toBeVisible()
    await page.locator('.event-card.kind-quake').first().click()
    await expect(page.getByRole('dialog')).toContainText(
      snapshot.events[0].provider_id,
    )
    await page.keyboard.press('Escape')
    await page.reload()
    await expect(page.locator('.event-card')).toHaveCount(5)
    await page.clock.setFixedTime(now + 46 * 60_000)
    await expect(
      page.getByText('STALE · last available observations', { exact: true }),
    ).toBeVisible()
  })
}
test('pipeline failure retains observations with stale status and missing snapshot stays honest', async ({
  context,
  page,
}) => {
  await context.route('**/data/usgs.json', (route) =>
    route.fulfill({
      json: {
        ...published,
        health: {
          ...published.health,
          status: 'stale',
          error: 'USGS fetch failed.',
        },
      },
    }),
  )
  await page.goto(`${origin}${base}?view=list`)
  await expect(page.locator('.event-card')).toHaveCount(5)
  await expect(
    page.getByText('STALE · last available observations', { exact: true }),
  ).toBeVisible()
  await context.route('**/data/usgs.json', (route) =>
    route.fulfill({ json: {} }),
  )
  await page.clock.setFixedTime(now + 61_000)
  await page.getByText('Freshness & source details', { exact: true }).click()
  await page.getByRole('button', { name: 'Refresh published data' }).click()
  await expect(
    page.getByText('Published snapshot unavailable.', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(5)
  await page.reload()
  await expect(
    page.getByText('USGS unavailable · no observations loaded', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(3)
})

test('independent live layers combine map/feed, clear selection and survive share/reload/back', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin,
  })
  await page.goto(`${origin}${base}?map=static&live=usgs,eonet`)
  await expect(page.locator('.event-card')).toHaveCount(4)
  await expect(page.locator('.static-marker')).toHaveCount(3)
  const quakes = page.getByRole('checkbox', { name: /USGS earthquakes/ })
  const hazards = page.getByRole('checkbox', { name: /EONET global hazards/ })
  await quakes.uncheck()
  await expect(page.locator('.event-card')).toHaveCount(2)
  await page
    .getByRole('button', { name: 'View Test volcanoes catalog entry' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Latest geometry date')
  await expect(dialog).toContainText('Occurrence / publication / update')
  await expect(dialog.getByRole('button', { name: 'Show on map' })).toHaveCount(
    0,
  )
  await page.keyboard.press('Escape')
  await hazards.uncheck()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(page.getByLabel('Selected event', { exact: true })).toHaveCount(
    0,
  )
  await expect(
    page.getByText('All live layers are off', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Copy view link' }).click()
  const shared = await page.evaluate(() => navigator.clipboard.readText())
  expect(new URL(shared).searchParams.get('live')).toBe('')
  await page.reload()
  await expect(quakes).not.toBeChecked()
  await expect(hazards).not.toBeChecked()
  await page.goBack()
  await expect(hazards).toBeChecked()
  await expect(page.locator('.event-card')).toHaveCount(2)
  await quakes.check()
  await expect(page.locator('.event-card')).toHaveCount(4)
  await page.locator('.category-menu > summary').click()
  await page.getByRole('button', { name: 'Environment', exact: true }).click()
  await page.locator('.category-menu > summary').click()
  await expect(page.locator('.event-card')).toHaveCount(3)
  await expect(
    page.getByText('Simulation lab · invented examples', { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.locator('.event-card').filter({ hasText: /simulated|scenario/i }),
  ).toHaveCount(0)
})

test('EONET failure is independent, browser failure retains memory and valid empty stays explicit', async ({
  page,
  context,
}) => {
  await context.route('**/data/eonet.json', (route) =>
    route.fulfill({
      json: {
        ...hazardPublished,
        health: {
          ...hazardPublished.health,
          status: 'stale',
          error: 'EONET check failed.',
        },
      },
    }),
  )
  await page.goto(`${origin}${base}?view=list`)
  await expect(
    page.getByText('Live USGS earthquakes', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('STALE · last available EONET catalog', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(5)
  await context.route('**/data/eonet.json', (route) =>
    route.fulfill({ json: {} }),
  )
  await page.clock.setFixedTime(now + 61_000)
  await page
    .getByText('EONET freshness & source details', { exact: true })
    .click()
  await page.getByRole('button', { name: 'Refresh EONET data' }).click()
  await expect(page.getByLabel('EONET status')).toContainText(
    'Previously loaded records are retained',
  )
  await expect(page.locator('.event-card')).toHaveCount(5)
  await page.reload()
  await expect(
    page.getByText('EONET unavailable · no catalog loaded', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(3)
  await context.route('**/data/eonet.json', (route) =>
    route.fulfill({
      json: {
        ...hazardPublished,
        snapshot: {
          ...hazardPublished.snapshot,
          feed: { title: 'EONET Events', events: [] },
        },
        health: { ...hazardPublished.health, record_count: 0 },
      },
    }),
  )
  await page.reload()
  await expect(
    page.getByText('Valid empty catalog response.', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(3)
})

test('fire and German warnings combine with independent toggles, details, validity and safe map semantics', async ({
  page,
  context,
}, info) => {
  await context.route('**/data/dwd.json', (r) =>
    r.fulfill({ json: warningPublished }),
  )
  await page.goto(
    `${origin}${base}?map=static&hours=72&live=usgs,eonet,dwd,firms`,
  )
  await expect(
    page.getByRole('checkbox', { name: /FIRMS thermal/ }),
  ).toBeChecked()
  await expect(
    page.getByRole('checkbox', { name: /DWD weather/ }),
  ).toBeChecked()
  await expect(page.locator('.event-card.kind-warning')).toHaveCount(1)
  await expect(page.locator('.event-card.kind-fire')).toHaveCount(1)
  // Thermal cells are a heat field, not marker buttons, on both maps.
  await expect(page.locator('.static-marker')).toHaveCount(3)
  await expect(page.locator('.static-heat')).toHaveCount(1)
  await page.locator('.event-card.kind-warning').click()
  await expect(page.getByRole('dialog')).toContainText('Not supplied')
  await expect(page.getByRole('dialog')).toContainText('CC BY 4.0')
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Show on map' }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.locator('.event-card.kind-fire').click()
  await expect(page.getByRole('dialog')).toContainText('2° × 2° cell')
  await expect(page.getByRole('dialog')).toContainText('not distinct fires')
  await page.keyboard.press('Escape')
  const warnings = page.getByRole('checkbox', { name: /DWD weather/ })
  await warnings.uncheck()
  await expect(page.locator('.event-card.kind-warning')).toHaveCount(0)
  await page.reload()
  await expect(warnings).not.toBeChecked()
  await warnings.check()
  for (const width of info.project.name === 'mobile' ? [390, 320] : [1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(() => document.fonts.ready)
    await expect
      .poll(() =>
        page
          .locator('.layer-toggles')
          .evaluate((e) => e.scrollWidth <= e.clientWidth),
      )
      .toBe(true)
    // Desktop: every layer, the window and view controls fit in the
    // console's control panel without scrolling it.
    if (width === 1440) {
      const controls = (await page.locator('.panel-controls').boundingBox())!
      expect(controls.y + controls.height).toBeLessThan(1000)
      for (const row of await page.locator('.layer-toggle').all()) {
        const box = (await row.boundingBox())!
        expect(box.y + box.height).toBeLessThan(controls.y + controls.height)
      }
    }
    await page.evaluate(() => document.fonts.ready)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await page
      .getByRole('link', { name: 'GOSIP home' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/phase-14-${width}.png`,
      fullPage: true,
    })
  }
  await page.getByRole('button', { name: '24 hours', exact: true }).click()
  await expect(page.locator('.event-card.kind-fire')).toHaveCount(1)
  await page.clock.setFixedTime(now + 2 * 3600000)
  await expect(page.locator('.event-card.kind-warning')).toHaveCount(0)
  await page.goto(`${origin}${base}?source=fire-demo`)
  await expect(page.locator('.event-card.kind-fire')).toHaveCount(1)
  await expect(page.locator('.demo-banner')).toHaveCount(0)
  expect(new URL(page.url()).searchParams.get('live')).toBe('firms')
})

test('warning and fire failures retain original data and cannot hide healthy sources', async ({
  page,
  context,
}) => {
  await context.route('**/data/dwd.json', (r) =>
    r.fulfill({ json: warningPublished }),
  )
  await page.goto(
    `${origin}${base}?view=list&hours=72&live=usgs,eonet,dwd,firms`,
  )
  await expect(page.locator('.event-card.kind-warning')).toHaveCount(1)
  await expect(page.locator('.event-card.kind-fire')).toHaveCount(1)
  await context.route('**/data/dwd.json', (r) =>
    r.fulfill({
      json: {
        version: 1,
        snapshot: null,
        health: {
          ...warningPublished.health,
          status: 'failed',
          record_count: 0,
          fetched_at: null,
          generated_at: null,
          error: 'DWD failed.',
        },
      },
    }),
  )
  await context.route('**/data/firms.json', (r) => r.fulfill({ json: {} }))
  await page.clock.setFixedTime(now + 61000)
  await page
    .getByText('DWD freshness & source details', { exact: true })
    .click()
  await page.getByRole('button', { name: 'Refresh DWD data' }).click()
  await page
    .getByText('FIRMS freshness & source details', { exact: true })
    .click()
  await page.getByRole('button', { name: 'Refresh FIRMS data' }).click()
  await expect(
    page.getByText('STALE · last available DWD warnings', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('STALE · last available FIRMS summary', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card.kind-warning')).toHaveCount(1)
  await expect(page.locator('.event-card.kind-fire')).toHaveCount(1)
  await expect(
    page.getByText('Live USGS earthquakes', { exact: true }),
  ).toBeVisible()
})

test('global thermal feed is paged while all cells remain searchable and mapped', async ({
  page,
  context,
}) => {
  const cells = Array.from({ length: 120 }, (_, i) => [
    -179 + (i % 90) * 2,
    -89 + Math.floor(i / 90) * 2,
    i + 1,
  ])
  const large = {
    ...firePublished,
    health: { ...firePublished.health, record_count: 120 },
    snapshot: {
      ...firePublished.snapshot,
      feed: { ...firePublished.snapshot.feed, cells },
    },
  }
  await context.route('**/data/firms.json', (r) => r.fulfill({ json: large }))
  await page.goto(`${origin}${base}?map=static&live=firms`)
  await expect(page.locator('.event-card')).toHaveCount(50)
  await expect(page.locator('.static-marker')).toHaveCount(0)
  await expect(page.locator('.static-heat')).toBeVisible()
  await expect(page.getByLabel('Feed pages')).toContainText('1–50 of 120')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByLabel('Feed pages')).toContainText('51–100 of 120')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(20)
  // Clicking the heat field selects the 2° cell beneath (-179°, -89°).
  const world = page.locator('.static-world')
  const box = (await world.boundingBox())!
  await world.dispatchEvent('click', {
    clientX: box.x + box.width * (1 / 360),
    clientY: box.y + box.height * (179 / 180),
  })
  await expect(page.getByRole('dialog')).toContainText('1 thermal detection')
  await page.keyboard.press('Escape')
  // Cells list busiest first, so the quietest cell reveals the last page.
  await expect(page.getByLabel('Feed pages')).toContainText('101–120 of 120')
  // A selection plus pagination must leave cards clickable on narrow phones.
  await page.setViewportSize({ width: 320, height: 740 })
  await page.locator('.event-card').nth(1).click()
  await expect(page.getByRole('dialog')).toContainText('19 thermal detections')
  await page.keyboard.press('Escape')
  await page.locator('.event-card').nth(2).click()
  await expect(page.getByRole('dialog')).toContainText('18 thermal detections')
  await page.keyboard.press('Escape')
  await page
    .getByRole('searchbox', { name: 'Search events' })
    .fill('120 thermal')
  await expect(page.locator('.event-card')).toHaveCount(1)
  await expect(page.locator('.static-heat')).toBeVisible()
})

test('digital aggregates replace simulations, preserve delayed intervals and retain memory on failure', async ({
  page,
  context,
}, info) => {
  if (info.project.name === 'mobile')
    await page.setViewportSize({ width: 320, height: 740 })
  await page.goto(
    `${origin}${base}?source=digital-demo&map=static&layers=physical&digital=connectivity&country=example`,
  )
  const toggle = page.getByRole('checkbox', {
    name: 'OONI digital measurements',
  })
  await expect(toggle).toBeChecked()
  await expect(page.locator('.event-card.kind-ooni')).toHaveCount(2)
  await expect(page.locator('.static-map .kind-ooni')).toHaveCount(1)
  await expect(
    page.getByRole('button', {
      name: 'Digital world · simulated',
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(
    page.getByText('Live OONI · delayed daily measurements', { exact: true }),
  ).toBeVisible()
  await page
    .locator('.event-card.kind-ooni')
    .filter({ hasText: 'Canada' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('CC BY-NC-SA 4.0')
  await expect(dialog).toContainText('not people, networks or outages')
  await expect(dialog).toContainText('Not supplied')
  await expect(
    dialog.getByRole('button', { name: 'Show on map', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '24 hours', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.getByRole('button', { name: '3 days', exact: true }).click()
  await page.reload()
  await expect(page.locator('.event-card.kind-ooni')).toHaveCount(2)
  await page.screenshot({
    path: `test-results/phase16-${info.project.name}-digital.png`,
    fullPage: true,
  })
  await context.route('**/data/ooni.json', (route) =>
    route.fulfill({
      json: {
        version: 1,
        snapshot: null,
        health: {
          ...ooniPublished.health,
          status: 'failed',
          fetched_at: null,
          record_count: 0,
          error: 'OONI request failed.',
        },
      },
    }),
  )
  await page.clock.setFixedTime(now + 61_000)
  await page
    .getByText('Digital freshness & source details', { exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Refresh digital data', exact: true })
    .click()
  await expect(
    page.getByText('STALE · last available OONI measurements', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card.kind-ooni')).toHaveCount(2)
  await page
    .locator('.event-card.kind-ooni')
    .filter({ hasText: 'Canada' })
    .click()
  await expect(dialog).toContainText('STALE · retained measurements')
  await page.keyboard.press('Escape')
  await toggle.uncheck()
  await expect(
    page.getByText('All live layers are off', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(toggle).not.toBeChecked()
})

test('space schedules replace the lab, use forward windows and retain independent failed data', async ({
  page,
  context,
}, info) => {
  await page.goto(
    `${origin}${base}?source=space-demo&map=static&layers=physical&country=example`,
  )
  const toggle = page.getByRole('checkbox', { name: 'Space launch schedules' })
  await expect(toggle).toBeChecked()
  await expect(page.locator('.event-card.kind-launch')).toHaveCount(1)
  await expect(page.locator('.static-map .kind-launch')).toHaveCount(1)
  await expect(
    page.getByRole('button', { name: 'Space · simulated', exact: true }),
  ).toHaveCount(0)
  await page.locator('.event-card.kind-launch').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('SCHEDULED LAUNCH · LL2')
  await expect(dialog).toContainText('minute precision')
  await expect(dialog).toContainText('Unknown · no launch observation asserted')
  await expect(dialog).toContainText('Rounded to 1°')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '24 hours', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.getByRole('button', { name: '3 days', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(1)
  await page
    .getByRole('checkbox', { name: 'OONI digital measurements' })
    .check()
  await expect(page.locator('.event-card')).toHaveCount(3)
  await page.getByRole('searchbox', { name: 'Search events' }).fill('spaceport')
  await expect(page.locator('.event-card')).toHaveCount(1)
  await page.getByRole('searchbox', { name: 'Search events' }).fill('')
  await page
    .getByRole('checkbox', { name: 'OONI digital measurements' })
    .uncheck()
  await page.reload()
  await expect(toggle).toBeChecked()
  await context.route('**/data/launches.json', (route) =>
    route.fulfill({
      json: {
        ...launchPublished,
        snapshot: null,
        health: {
          ...launchPublished.health,
          status: 'failed',
          record_count: 0,
          fetched_at: null,
          error: 'Launches request failed.',
        },
      },
    }),
  )
  await page.clock.setFixedTime(now + 61_000)
  await page
    .getByText('Space freshness & source details', { exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Refresh space data', exact: true })
    .click()
  await expect(
    page.getByText('STALE · last available launch schedules', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(1)
  await page.locator('.event-card').click()
  await expect(dialog).toContainText('STALE · retained schedule')
  await page.keyboard.press('Escape')
  if (info.project.name === 'mobile')
    await page.setViewportSize({ width: 320, height: 740 })
  await page.screenshot({
    path: `test-results/phase17-${info.project.name}-space-static.png`,
    fullPage: true,
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await toggle.uncheck()
  await page.reload()
  await expect(toggle).not.toBeChecked()
  await expect(
    page.getByText('All live layers are off', { exact: true }),
  ).toBeVisible()
})

test('space sites use shared globe icons and camera selection on desktop and phone', async ({
  page,
}, info) => {
  test.setTimeout(120_000)
  await page.goto(`${origin}${base}?live=launches&hours=168`)
  await expect(page.getByText('Interactive map', { exact: true })).toBeVisible({
    timeout: 20000,
  })
  await expect(page.locator('.map-canvas .kind-launch')).toHaveCount(1)
  await page.locator('.event-card.kind-launch').click()
  await expect(page.getByRole('dialog')).toContainText('Launch Library 2')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Show on map', exact: true })
    .click()
  await expect(page.locator('.map-canvas .kind-launch')).toBeVisible({
    timeout: 15000,
  })
  await expect(page.locator('.hud-readout')).toContainText('1,400 km', {
    timeout: 15000,
  })
  await page.screenshot({
    path: `test-results/phase17-${info.project.name}-space-globe.png`,
    fullPage: true,
  })
  if (info.project.name === 'desktop') {
    for (const label of await page.locator('.layer-toggle').all()) {
      const box = await label.boundingBox()
      expect(box!.y + box!.height).toBeLessThan(1000)
    }
  } else {
    await page.setViewportSize({ width: 320, height: 740 })
    await page.screenshot({
      path: 'test-results/phase17-mobile-320-space-globe.png',
      fullPage: true,
    })
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('maritime delayed glow, combined filters, all-off and failure retention replace the maritime lab', async ({
  page,
  context,
}) => {
  await page.goto(
    `${origin}${base}?source=maritime-demo&map=static&layers=civic`,
  )
  const toggle = page.getByRole('checkbox', {
    name: 'Maritime port-call estimates',
  })
  await expect(toggle).toBeChecked()
  await expect(page.locator('.event-card.kind-maritime')).toHaveCount(3)
  await expect(page.locator('.maritime-heat')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Maritime · simulated', exact: true }),
  ).toHaveCount(0)
  await page.locator('.event-card.kind-maritime').first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('ESTIMATED PORT CALLS · PORTWATCH')
  await expect(dialog).toContainText('Unknown · daily estimates only')
  await expect(dialog).toContainText('UN Global Platform')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '3 days', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page
    .getByRole('checkbox', { name: 'OONI digital measurements' })
    .check()
  await expect(page.locator('.event-card.kind-ooni')).toHaveCount(2)
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await expect(page.locator('.event-card')).toHaveCount(5)
  await page.getByRole('searchbox', { name: 'Search events' }).fill('North Sea')
  await expect(page.locator('.event-card')).toHaveCount(1)
  await page.getByRole('searchbox', { name: 'Search events' }).fill('')
  await page
    .getByRole('checkbox', { name: 'OONI digital measurements' })
    .uncheck()
  await page.reload()
  await expect(toggle).toBeChecked()
  await context.route('**/data/maritime.json', (route) =>
    route.fulfill({
      json: {
        ...maritimePublished,
        snapshot: null,
        health: {
          ...maritimePublished.health,
          status: 'failed',
          record_count: 0,
          fetched_at: null,
          error: 'Maritime request failed.',
        },
      },
    }),
  )
  await page.clock.setFixedTime(now + 61000)
  await page
    .getByText('Maritime freshness & source details', { exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Refresh maritime data', exact: true })
    .click()
  await expect(
    page.getByText('STALE · last available port estimates', { exact: true }),
  ).toBeVisible()
  await expect(page.locator('.event-card.kind-maritime')).toHaveCount(3)
  await page.locator('.event-card.kind-maritime').first().click()
  await expect(dialog).toContainText('STALE · retained estimates')
  await page.keyboard.press('Escape')
  await toggle.uncheck()
  await page.reload()
  await expect(toggle).not.toBeChecked()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(page.locator('.maritime-heat')).toHaveCount(0)
})

test('real history navigates captures, layers, filters, selection and saved current subsets', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.goto(
    `${origin}${base}?live=usgs,eonet,news&hours=168&history=latest`,
  )
  await expect(page.getByLabel('Published capture · UTC')).toHaveValue(
    new Date(now).toISOString(),
  )
  await expect(page.locator('.panel-feed')).toContainText('archived')
  await expect(
    page.getByRole('checkbox', { name: 'Global Voices reports' }),
  ).toHaveCount(0)
  await expect(page.locator('.event-card.kind-news')).toHaveCount(0)
  await expect(page.locator('.map-canvas canvas').first()).toBeVisible()
  await page.locator('.event-card.kind-quake').first().click()
  await expect(page.getByRole('dialog')).toContainText('ARCHIVED SNAPSHOT')
  await expect(page.getByRole('dialog')).toContainText('Fresh at capture')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Earlier capture' }).click()
  await expect(page.getByLabel('Published capture · UTC')).toHaveValue(
    new Date(now - 86400000).toISOString(),
  )
  await expect(page.locator('.event-card').first()).toContainText(
    'Earlier captured test region',
  )
  await expect(page.locator('.event-card.is-selected')).toHaveCount(0)
  await expect(
    page.getByRole('checkbox', { name: /EONET global/ }).locator('..'),
  ).toContainText('Missing capture')
  await page
    .getByRole('searchbox', { name: 'Search events' })
    .fill('no such event')
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Search events' }).fill('')
  await page.getByRole('checkbox', { name: 'USGS earthquakes' }).uncheck()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.getByRole('checkbox', { name: 'USGS earthquakes' }).check()
  await page.getByRole('button', { name: 'Later capture' }).click()
  await page.reload()
  await expect(page.getByLabel('Published capture · UTC')).toHaveValue(
    new Date(now).toISOString(),
  )
  for (const width of info.project.name === 'mobile' ? [390, 320] : [1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page
      .getByRole('link', { name: 'GOSIP home' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: `test-results/history-${width}-globe.png` })
    await page.locator('.archive-controls').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/history-${width}-controls.png`,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    if (width === 1440) {
      const box = (await page.locator('.panel-controls').boundingBox())!
      expect(box.y + box.height).toBeLessThan(1000)
    }
  }
  await page.getByRole('button', { name: 'Current', exact: true }).click()
  await expect(
    page.getByRole('checkbox', { name: 'Global Voices reports' }),
  ).toBeChecked()
  await expect(page.locator('.event-card.kind-news')).toHaveCount(1)
  expect(page.url()).not.toContain('history=')
})

test('history failures, expired links and no-layer subsets never substitute current records', async ({
  page,
}) => {
  await page.goto(`${origin}${base}?live=&history=latest&view=list`)
  await expect(page.getByLabel('Published capture · UTC')).toHaveValue(
    new Date(now).toISOString(),
  )
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.goto(
    `${origin}${base}?live=usgs&history=${encodeURIComponent(new Date(now - 3 * 86400000).toISOString())}&view=list`,
  )
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'History provenance' }),
  ).toContainText('missing or expired')
  await page.route('**/data/history.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.goto(`${origin}${base}?live=usgs&history=latest&view=list`)
  await expect(page.getByRole('alert')).toContainText('History unavailable')
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Current', exact: true }),
  ).toBeEnabled()
})

test('loaded history retains its original version after reload failure and prunes by real clock', async ({
  page,
}) => {
  await page.goto(
    `${origin}${base}?live=usgs&history=latest&view=list&hours=168`,
  )
  await expect(page.locator('.event-card').first()).toBeVisible()
  const first = await page.locator('.event-card').first().textContent()
  await page.route('**/data/history.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.clock.setFixedTime(now + 61000)
  await page.getByRole('button', { name: 'Reload history' }).click()
  await expect(page.getByRole('alert')).toContainText('History unavailable')
  expect(await page.locator('.event-card').first().textContent()).toBe(first)
  await page.route('**/data/history.json', (route) =>
    route.fulfill({
      json: {
        ...archivePublished,
        attempted_at: new Date(now + 122000).toISOString(),
        status: 'degraded',
        error: 'capture-unavailable',
        captures: [],
      },
    }),
  )
  await page.clock.setFixedTime(now + 122000)
  await page.getByRole('button', { name: 'Reload history' }).click()
  await expect(
    page.getByRole('region', { name: 'History provenance' }),
  ).toContainText('Capture failed')
  expect(await page.locator('.event-card').first().textContent()).toBe(first)
  await page.clock.setFixedTime(now + 8 * 86400000)
  await page.getByRole('button', { name: 'Reload history' }).click()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(
    page.getByRole('region', { name: 'History provenance' }),
  ).toContainText('Archive updates are stale')
})

test('retired aviation stays coming after reload and keyboard opens real records', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(
    `${origin}${base}?source=aviation-demo&at=2026-10-08T12:00:00.000Z&view=list`,
  )
  await expect(
    page.getByRole('heading', { name: 'Aviation · Coming' }),
  ).toBeVisible()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(
    page.locator('.lab, .demo-banner, input[type=range]'),
  ).toHaveCount(0)
  expect(new URL(page.url()).searchParams.has('at')).toBe(false)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Aviation · Coming' }),
  ).toBeVisible()
  const quakes = page.getByRole('checkbox', { name: 'USGS earthquakes' })
  await quakes.focus()
  await page.keyboard.press('Space')
  await expect(quakes).toBeChecked()
  await expect(page.locator('.event-card')).toHaveCount(2)
  const card = page.locator('.event-card').first()
  await card.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toContainText('USGS')
  await page.keyboard.press('Escape')
  await expect(card).toBeFocused()
  await page.getByRole('button', { name: 'History', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Published capture · UTC')).toBeVisible()
  await page.getByLabel('Published capture · UTC').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('Enter')
  await expect(page.locator('.event-card')).toHaveCount(2)
  await page.screenshot({
    path: `test-results/phase20-${info.project.name}-keyboard.png`,
    scale: 'css',
  })
})
