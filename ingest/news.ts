import { XMLParser, XMLValidator } from 'fast-xml-parser'
import {
  newsRecord,
  NEWS_DELAY_MS,
  NEWS_MAX_BYTES,
  parseNews,
  publishNews,
  decodeNews,
} from '../src/data/news'
import { object } from '../src/data/dwd'
import { ingestSource } from './source'
export const NEWS_URL = 'https://globalvoices.org/feed/'
export function extractNews(raw: string, now: number) {
  // Reject declarations/entities before parsing. Never execute/render supplied HTML.
  if (/<!DOCTYPE|<!ENTITY/i.test(raw) || XMLValidator.validate(raw) !== true)
    throw Error('Invalid RSS')
  const c = object(
    new XMLParser({ parseTagValue: false, trimValues: true }).parse(raw)?.rss
      ?.channel,
  )
  if (
    c.title !== 'Global Voices' ||
    c.link !== 'https://globalvoices.org' ||
    c.language !== 'en-US' ||
    !String(c.copyright).includes('Creative Commons Attribution')
  )
    throw Error('Unexpected publisher')
  const items =
    c.item === undefined ? [] : Array.isArray(c.item) ? c.item : [c.item]
  if (items.length > 40) throw Error('Too many reports')
  const seen = new Set<string>()
  return items
    .map((value) => {
      const i = object(value)
      const date = Date.parse(String(i.pubDate))
      if (!Number.isFinite(date)) throw Error('Invalid publication')
      const record = newsRecord(
        {
          title: i.title,
          url: i.link,
          author: i['dc:creator'],
          published_at: new Date(date).toISOString(),
        },
        now,
      )
      if (seen.has(record.url)) throw Error('Duplicate news link')
      seen.add(record.url)
      return record
    })
    .filter(
      (r) =>
        Date.parse(r.published_at) <= now - NEWS_DELAY_MS &&
        Date.parse(r.published_at) >= now - 7 * 86400_000,
    )
}
export const ingestNews = (fetcher: typeof fetch = fetch, now = Date.now()) =>
  ingestSource(
    {
      source: 'news',
      url: NEWS_URL,
      maxBytes: 1_000_000,
      publicationMaxBytes: NEWS_MAX_BYTES,
      decodeResponse: (raw) => extractNews(raw, now),
      parse: parseNews,
      publish: publishNews,
      decode: decodeNews,
      validate() {},
    },
    fetcher,
    now,
  )
