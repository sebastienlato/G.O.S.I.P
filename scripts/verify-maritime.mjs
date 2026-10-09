import assert from 'node:assert/strict'
import { expect } from '@playwright/test'
export async function verifyMaritime(page, site, publication, name) {
  const f = publication.snapshot.feed
  assert.equal(f.covered_ports, 5)
  assert.equal(publication.health.generated_at, null)
  assert(
    Date.parse(f.interval_end) <=
      Date.parse(publication.snapshot.retrieved_at) - 3 * 86400000,
  )
  assert(
    f.rows.every(
      (r) =>
        Object.keys(r).sort().join(',') === 'count,region' &&
        r.count >= 20 &&
        r.count % 10 === 0,
    ),
  )
  await page.goto(site + '?live=maritime&hours=168')
  const toggle = page.getByRole('checkbox', {
    name: 'Maritime port-call estimates',
  })
  await expect(toggle).toBeChecked()
  await expect(page.locator('.map-canvas canvas').first()).toBeVisible()
  await page.getByRole('button', { name: 'Reset map view' }).click()
  await page.waitForTimeout(1500)
  await page.screenshot({
    path: `test-results/live/phase18-${name}-orbit.png`,
    scale: 'css',
  })
  const inWindow = Date.parse(f.interval_end) > Date.now() - 7 * 86400000
  await expect(page.locator('.event-card.kind-maritime')).toHaveCount(
    inWindow ? f.rows.length : 0,
  )
  if (inWindow && f.rows.length) {
    await page.locator('.event-card.kind-maritime').first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText('ESTIMATED PORT CALLS · PORTWATCH')
    await expect(dialog).toContainText('Unknown · daily estimates only')
    await expect(dialog).toContainText(f.interval_start.slice(0, 10))
    await expect(dialog).toContainText('UN Global Platform')
    await page.screenshot({
      path: `test-results/live/phase18-${name}-details.png`,
    })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1500)
  }
  await page.getByRole('link', { name: 'GOSIP home' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: `test-results/live/phase18-${name}-globe.png` })
  if (name === 'desktop') {
    const box = await page.locator('.panel-controls').boundingBox()
    assert(box.y + box.height <= 1000, 'Controls must fit')
  }
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  )
  await toggle.uncheck()
  await expect(page.locator('.event-card')).toHaveCount(0)
  await page.reload()
  await expect(toggle).not.toBeChecked()
  await toggle.check()
  await expect(page.locator('.event-card.kind-maritime')).toHaveCount(
    inWindow ? f.rows.length : 0,
  )
  await page.getByRole('button', { name: '3 days', exact: true }).click()
  await expect(page.locator('.event-card.kind-maritime')).toHaveCount(0)
  await page.getByRole('button', { name: '7 days', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Search events' }).fill('North Sea')
  await expect(page.locator('.event-card')).toHaveCount(
    inWindow && f.rows.some((r) => r.region === 'north-sea') ? 1 : 0,
  )
  await page.getByRole('searchbox', { name: 'Search events' }).fill('')
  if (name === 'mobile') {
    await page.setViewportSize({ width: 320, height: 740 })
    await page
      .getByRole('link', { name: 'GOSIP home' })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: 'test-results/live/phase18-320-globe.png' })
    await page.locator('.panel-controls').scrollIntoViewIfNeeded()
    await page.screenshot({
      path: 'test-results/live/phase18-320-controls.png',
      scale: 'css',
    })
    if (inWindow && f.rows.length) {
      await page.locator('.event-card.kind-maritime').first().click()
      await expect(page.getByRole('dialog')).toContainText('10° regions')
      await page.screenshot({
        path: 'test-results/live/phase18-320-details.png',
        scale: 'css',
      })
      await page.keyboard.press('Escape')
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    )
  }
  console.log(
    `${name}: maritime ${f.interval_start.slice(0, 10)}, ${f.rows.length} regions; globe/details/date/ranges/filter/toggle/reload verified.`,
  )
}
