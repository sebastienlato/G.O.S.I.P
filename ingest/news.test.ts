import { expect, it } from 'vitest'
import { extractNews, ingestNews } from './news'
import { parseNews, decodeNews, publishNews } from '../src/data/news'
import { eventTime, eventBadge, filterEvents } from '../src/data/events'
import {
  defaultFilters,
  parseFilters,
  serializeFilters,
} from '../src/state/explorer'
import { aggregateFIRMS, streamFIRMS } from './firms'
import { parseFIRMS } from '../src/data/firms'
import { firmsCSV } from '../tests/fixtures/phase14'
const now = Date.parse('2026-10-09T12:00:00Z')
const r = {
  title: 'Test report & context',
  author: 'Test Writer',
  url: 'https://globalvoices.org/2026/10/07/test-report/',
  published_at: '2026-10-07T12:00:00.000Z',
}
const item = `<item><title>Test report &amp; context</title><dc:creator>Test Writer</dc:creator><link>${r.url}</link><pubDate>Wed, 07 Oct 2026 12:00:00 GMT</pubDate><description>FULL TEXT NOT PUBLISHED</description></item>`
const rss = (items = item) =>
  `<rss xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>Global Voices</title><link>https://globalvoices.org</link><language>en-US</language><copyright>Creative Commons Attribution</copyright>${items}</channel></rss>`
const stub = (f: (url: string) => Response) =>
  ((u) => Promise.resolve(f(String(u)))) as typeof fetch
it('extracts only attributed metadata, keeps publication distinct and filters combined source windows', async () => {
  expect(extractNews(rss(), now)).toEqual([r])
  const p = await ingestNews(
    stub(() => new Response(rss())),
    now,
  )
  expect(p.health.status).toBe('ok')
  expect(JSON.stringify(p)).not.toContain('FULL TEXT')
  const s = decodeNews(JSON.stringify(p), now).snapshot!
  expect(s.events[0]).toMatchObject({
    coordinates: null,
    occurred_at: null,
    updated_at: null,
    source_language: 'en',
    author: r.author,
  })
  expect(eventTime(s.events[0])).toBe(r.published_at)
  expect(eventBadge(s.events[0])).toContain('ATTRIBUTED REPORT')
  const fire = parseFIRMS(aggregateFIRMS(firmsCSV('2026-10-09'), now), now)
  const combined = [...s.events, ...fire.events]
  expect(
    filterEvents(combined, '', ['civic', 'environment'], 24, now),
  ).toHaveLength(1)
  expect(
    filterEvents(combined, '', ['civic', 'environment'], 72, now),
  ).toHaveLength(2)
  expect(
    filterEvents(combined, 'Test Writer', ['civic', 'environment'], 72, now),
  ).toHaveLength(1)
})
it('rejects malformed XML, declarations, unsafe text, duplicate links, wrong publisher, oversized feeds and invented times', () => {
  for (const bad of [
    rss().replace('</rss>', ''),
    '<!DOCTYPE rss>' + rss(),
    rss(item + item),
    rss().replace('Global Voices', 'Other'),
    rss(item.repeat(41)),
    rss().replace('Test report &amp; context', '&lt;script&gt;'),
  ])
    expect(() => extractNews(bad, now)).toThrow()
  for (const bad of [
    { ...r, url: 'https://evil.test/2026/10/07/test-report/' },
    { ...r, author: '\u202ehidden' },
    { ...r, published_at: '2026-10-09T13:00:00.000Z' },
  ])
    expect(() => parseNews([bad], now)).toThrow()
  expect(
    extractNews(
      rss().replace(
        'Wed, 07 Oct 2026 12:00:00 GMT',
        'Fri, 09 Oct 2026 11:00:00 GMT',
      ),
      now,
    ),
  ).toEqual([])
})
it.each(['network', '429', 'invalid', 'oversized'])(
  'retains original news times after %s failure without empty-as-success',
  async (failure) => {
    const previous = await ingestNews(
      stub(() => new Response(rss())),
      now,
    )
    const p = await ingestNews(
      stub((url) => {
        if (url.includes('github.io'))
          return new Response(JSON.stringify(previous))
        if (failure === 'network') throw Error('PRIVATE RAW ERROR')
        if (failure === '429') return new Response('', { status: 429 })
        if (failure === 'oversized')
          return new Response('', { headers: { 'Content-Length': '1000001' } })
        return new Response('<rss>')
      }),
      now + 3600000,
    )
    expect(p.snapshot).toEqual(previous.snapshot)
    expect(p.health.status).toBe('stale')
    expect(p.health.fetched_at).toBe(previous.health.fetched_at)
    expect(JSON.stringify(p)).not.toContain('PRIVATE RAW')
  },
)
it('distinguishes valid no-eligible reports from failures and revalidates health', async () => {
  const empty = await ingestNews(
    stub(() => new Response(rss(''))),
    now,
  )
  expect(empty.health).toMatchObject({ status: 'ok', record_count: 0 })
  const failed = await ingestNews(
    stub(() => new Response('bad')),
    now,
  )
  expect(failed.health).toMatchObject({ status: 'failed', record_count: 0 })
  expect(failed.snapshot).toBeNull()
  const s = parseNews([r], now)
  expect(() =>
    decodeNews(
      JSON.stringify(publishNews(s, { ...empty.health, record_count: 0 })),
      now,
    ),
  ).toThrow()
})
it('defaults DWD off and persists explicit all-on and news-only selections', () => {
  expect(defaultFilters.liveLayers).not.toContain('dwd')
  for (const search of [
    '',
    '?live=news',
    '?live=usgs,eonet,dwd,news',
    '?live=',
  ]) {
    const f = parseFilters(search)
    expect(parseFilters(serializeFilters(f))).toEqual(f)
  }
})
it('streams global rows across chunk boundaries, drops old rows and never emits precision', async () => {
  const csv =
    firmsCSV('2026-10-09')
      .replace('50.1234,-100.2345', '-30.1234,130.2345')
      .replace('50.2234,-100.3345', '70.2234,170.3345') +
    firmsCSV('2026-10-07').split('\n')[1] +
    '\n'
  const bytes = new TextEncoder().encode(csv)
  const streamed = await streamFIRMS(
    new Response(
      new ReadableStream({
        start(c) {
          for (let i = 0; i < bytes.length; i += 7)
            c.enqueue(bytes.slice(i, i + 7))
          c.close()
        },
      }),
    ),
    now,
  )
  expect(streamed).toEqual(aggregateFIRMS(csv, now))
  expect(parseFIRMS(streamed, now).events).toHaveLength(2)
  expect(JSON.stringify(streamed)).not.toContain('30.1234')
  await expect(
    streamFIRMS(
      new Response('', { headers: { 'Content-Length': '64000001' } }),
      now,
    ),
  ).rejects.toThrow('Response too large')
})

it('accepts the documented NRT product RT/URT versions without retaining precise positions', () => {
  for (const version of ['2.0NRT', '2.0RT', '2.0URT', '2.1URT']) {
    const feed = aggregateFIRMS(
      firmsCSV('2026-10-09').replaceAll('2.0NRT', version),
      now,
    )
    expect(parseFIRMS(feed, now).events[0].detection_count).toBe(2)
  }
})
