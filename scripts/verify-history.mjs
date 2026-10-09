import assert from 'node:assert/strict'
import { expect } from '@playwright/test'

export async function verifyHistory(page, site, name) {
  const response = await page.request.get(site + 'data/history.json')
  assert.equal(response.status(), 200)
  const raw = await response.text()
  assert(Buffer.byteLength(raw) <= 7_100_000)
  const a = JSON.parse(raw)
  assert.equal(a.version, 1)
  assert(a.captures.length > 0 && a.captures.length <= 7)
  const c = a.captures.at(-1)
  assert(Date.parse(c.captured_at) <= Date.parse(a.attempted_at))
  assert(Date.parse(c.captured_at) > Date.now() - 7 * 86400000)
  assert(Date.parse(c.release.built_at) <= Date.parse(c.captured_at))
  assert.match(c.release.source_commit, /^[a-f0-9]{40}$/)
  for (const key of ['usgs', 'eonet']) {
    const p = c.sources[key]
    assert(p.snapshot, `Release smoke expects ${key} capture`)
    assert.equal(p.health.source, key)
    assert(Buffer.byteLength(JSON.stringify(p)) <= 500000)
    assert(Date.parse(p.health.fetched_at) <= Date.parse(c.release.built_at))
  }
  await page.goto(site + '?live=usgs,eonet&hours=168&history=latest')
  await expect(page.getByLabel('Published capture · UTC')).toHaveValue(
    c.captured_at,
  )
  await expect(page.locator('.map-canvas canvas').first()).toBeVisible()
  await expect(page.locator('.panel-feed')).toContainText('archived')
  await expect(
    page.getByRole('checkbox', { name: 'Global Voices reports' }),
  ).toHaveCount(0)
  await page.locator('.event-card.kind-quake').first().click()
  await expect(page.getByRole('dialog')).toContainText('ARCHIVED SNAPSHOT')
  await expect(page.getByRole('dialog')).toContainText('Provider update')
  await page.keyboard.press('Escape')
  await page
    .getByText('Capture provenance & source health', { exact: true })
    .click()
  const provenance = page.getByRole('region', { name: 'History provenance' })
  await expect(provenance).toContainText('NASA EONET')
  await expect(provenance).toContainText('Generated unknown')
  await expect(provenance).toContainText(c.release.source_commit.slice(0, 7))
  for (const width of name === 'desktop' ? [1440] : [390, 320]) {
    await page.setViewportSize({ width, height: 1000 })
    await page
      .getByRole('link', { name: 'GOSIP home' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/live/phase19-${width}-globe.png`,
      scale: 'css',
    })
    await page.locator('.panel-controls').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/live/phase19-${width}-controls.png`,
      scale: 'css',
    })
    await provenance.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: `test-results/live/phase19-${width}-provenance.png`,
      scale: 'css',
    })
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
  }
  for (const label of [
    'USGS earthquakes',
    'EONET global hazards · Storms / volcanoes',
  ]) {
    await page.getByRole('checkbox', { name: label, exact: true }).uncheck()
  }
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await expect(page.getByLabel('Published capture · UTC')).toHaveValue(
    c.captured_at,
  )
  await page.getByRole('button', { name: 'Current', exact: true }).click()
  await expect(
    page.getByRole('checkbox', { name: 'USGS earthquakes', exact: true }),
  ).not.toBeChecked()
  await page.goto(site + '?live=usgs,eonet&hours=168')
  console.log(
    `${name}: real history ${a.captures.length} capture(s), ${Buffer.byteLength(raw)} bytes; captured ${c.captured_at} from published ${c.release.source_commit}, source times/provenance/globe/filter/subset/reload passed.`,
  )
}
