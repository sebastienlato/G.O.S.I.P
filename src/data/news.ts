import type { ExplorerEvent } from './events'
import type { PublishedSnapshot, SourceHealth } from './published'
import { object, iso } from './dwd'
export const NEWS_MAX_BYTES = 100_000
export const NEWS_DELAY_MS = 86400_000
export interface NewsRecord {
  title: string
  url: string
  author: string
  published_at: string
}
export interface NewsEvent {
  kind: 'news-report'
  id: string
  title: string
  summary: string
  category: 'civic'
  coordinates: null
  region: ''
  country: ''
  occurred_at: null
  updated_at: null
  published_at: string
  collected_at: string
  source_name: 'Global Voices'
  source_url: string
  source_language: 'en'
  author: string
  status: 'attributed claim'
  is_demo: false
  freshness: 'retrieved'
  coverage_note: string
}
export const isNews = (e: ExplorerEvent): e is NewsEvent =>
  'kind' in e && e.kind === 'news-report'
export interface NewsSnapshot {
  events: NewsEvent[]
  retrieved_at: string
  generated_at: null
  feed: NewsRecord[]
}
export function newsText(value: unknown, max: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > max ||
    /[<>\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/.test(value)
  )
    throw Error('Invalid news text')
  return value
}
export function newsRecord(input: unknown, now: number): NewsRecord {
  const r = object(input),
    url = new URL(newsText(r.url, 500))
  if (
    url.origin !== 'https://globalvoices.org' ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    !/^\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9%-]+\/$/i.test(url.pathname)
  )
    throw Error('Invalid news link')
  return {
    title: newsText(r.title, 500),
    url: url.href,
    author: newsText(r.author, 200),
    published_at: iso(r.published_at, now),
  }
}
export function parseNews(input: unknown, now: number): NewsSnapshot {
  if (!Array.isArray(input) || input.length > 40)
    throw Error('Invalid news feed')
  const seen = new Set<string>()
  const feed = input.map((r) => {
    const record = newsRecord(r, now)
    if (seen.has(record.url)) throw Error('Duplicate news link')
    seen.add(record.url)
    if (Date.parse(record.published_at) > now - NEWS_DELAY_MS)
      throw Error('Insufficient news delay')
    return record
  })
  const retrieved_at = new Date(now).toISOString()
  const events = feed.map((r): NewsEvent => ({
    kind: 'news-report',
    id: `news-${r.url.slice(25)}`,
    title: r.title,
    summary:
      'A Global Voices headline. An attributed publisher claim, not a verified incident.',
    category: 'civic',
    coordinates: null,
    region: '',
    country: '',
    occurred_at: null,
    updated_at: null,
    published_at: r.published_at,
    collected_at: retrieved_at,
    source_name: 'Global Voices',
    source_url: r.url,
    source_language: 'en',
    author: r.author,
    status: 'attributed claim',
    is_demo: false,
    freshness: 'retrieved',
    coverage_note:
      'English-edition feed headlines, delayed at least 24 hours. A bounded selection, not comprehensive world coverage. No coordinates, occurrence time, corroboration, inferred causes or casualty assessment. Publication is not occurrence; retrieval is not a provider update. GOSIP does not translate or summarize articles.',
  }))
  return { events, retrieved_at, generated_at: null, feed }
}
export function publishNews(
  s: NewsSnapshot | null,
  health: SourceHealth,
): PublishedSnapshot {
  return {
    version: 1,
    health,
    snapshot: s ? { retrieved_at: s.retrieved_at, feed: s.feed } : null,
  }
}
export function decodeNews(raw: string, now: number) {
  if (new TextEncoder().encode(raw).length > NEWS_MAX_BYTES)
    throw Error('Too large')
  const p = object(JSON.parse(raw)),
    h = object(p.health) as unknown as SourceHealth
  if (
    p.version !== 1 ||
    h.source !== 'news' ||
    !['ok', 'stale', 'failed'].includes(h.status) ||
    h.generated_at !== null ||
    !Number.isSafeInteger(h.record_count) ||
    h.record_count < 0 ||
    h.record_count > 40 ||
    (h.status === 'ok'
      ? h.error !== null
      : typeof h.error !== 'string' || h.error.length > 300)
  )
    throw Error('Invalid health')
  iso(h.attempted_at, now + 300_000)
  let snapshot: NewsSnapshot | null = null
  if (p.snapshot !== null) {
    const s = object(p.snapshot),
      retrieved = iso(s.retrieved_at, Date.parse(h.attempted_at))
    snapshot = parseNews(s.feed, Date.parse(retrieved))
    if (
      h.status === 'failed' ||
      h.fetched_at !== retrieved ||
      h.record_count !== snapshot.events.length
    )
      throw Error('Inconsistent health')
  } else if (
    h.status !== 'failed' ||
    h.record_count !== 0 ||
    h.fetched_at !== null
  )
    throw Error('Missing snapshot')
  return { snapshot, health: h }
}
