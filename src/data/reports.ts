import type { DemoEvent, ExplorerEvent } from './events'
import rawExamples from './reportExamples.json'

export const reportLanguages = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  ar: 'Arabic',
} as const
export type ReportLanguage = keyof typeof reportLanguages
export interface ReportEvent extends Omit<
  DemoEvent,
  'coordinates' | 'occurred_at' | 'status'
> {
  kind: 'report'
  status: 'attributed-claim'
  coordinates: [number, number] | null
  location_precision: 'region' | 'unknown' | 'withheld'
  occurred_at: string | null
  updated_at: string | null
  source_language: ReportLanguage
  source_url: string | null
  uncertainty: string
  translation: {
    language: 'en'
    title: string
    summary: string
    supplied_by: string
  } | null
  correction: {
    previous_title: string
    previous_summary: string
    previous_updated_at: string
    note: string
  } | null
}
export const isReport = (event: ExplorerEvent): event is ReportEvent =>
  'kind' in event && event.kind === 'report'
export const REPORT_COVERAGE =
  'Six original fictional reports across broad world regions, in four languages. This is a UI sample, not representative news coverage. Reports are attributed claims, never verified incidents. Repetition does not establish independent corroboration. Missing reports do not establish absence of activity.'

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid report object')
  return value as Record<string, unknown>
}
function text(value: unknown, limit = 1200): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > limit ||
    /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(value)
  )
    throw new Error('Invalid report text')
  return value.trim()
}
function date(value: unknown): string {
  const iso = text(value, 24)
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(iso) ||
    !Number.isFinite(Date.parse(iso)) ||
    new Date(iso).toISOString() !== iso
  )
    throw new Error('Invalid report date')
  return iso
}
// This adapter accepts original fixtures only. It does not authorize a real feed.
// Links are limited to bundled source documents; no third-party report URL is invented.
export function parseReportExamples(input: unknown): ReportEvent[] {
  if (!Array.isArray(input) || input.length > 50)
    throw new Error('Invalid report envelope')
  const ids = new Set<string>()
  return input.map((value) => {
    const e = object(value)
    const id = text(e.id, 64)
    if (!/^report-demo-[a-z0-9-]+$/.test(id) || ids.has(id))
      throw new Error('Invalid or duplicate report ID')
    ids.add(id)
    if (
      e.kind !== 'report' ||
      e.is_demo !== true ||
      e.status !== 'attributed-claim' ||
      e.freshness !== 'fixed-demo' ||
      e.category !== 'civic'
    )
      throw new Error('Only labeled synthetic reports accepted')
    const language = text(e.source_language, 8)
    if (!Object.hasOwn(reportLanguages, language))
      throw new Error('Invalid source language')
    const published = date(e.published_at)
    const collected = date(e.collected_at)
    const updated = e.updated_at === null ? null : date(e.updated_at)
    const occurred = e.occurred_at === null ? null : date(e.occurred_at)
    if (
      published > collected ||
      (updated && (updated < published || updated > collected)) ||
      (occurred && occurred > (updated ?? published))
    )
      throw new Error('Invalid report time order')
    let coordinates: [number, number] | null = null
    if (e.location_precision === 'region') {
      if (
        !Array.isArray(e.coordinates) ||
        e.coordinates.length !== 2 ||
        !e.coordinates.every(
          (n) => typeof n === 'number' && Number.isInteger(n) && n % 5 === 0,
        ) ||
        Math.abs(e.coordinates[0]) > 180 ||
        Math.abs(e.coordinates[1]) > 90
      )
        throw new Error('Expected a broad five-degree regional marker')
      coordinates = [e.coordinates[0], e.coordinates[1]]
    } else if (
      !['unknown', 'withheld'].includes(String(e.location_precision)) ||
      e.coordinates !== null
    )
      throw new Error('Unmapped reports must omit coordinates')
    if (e.source_url !== null && e.source_url !== `/reports/${id}.txt`)
      throw new Error('Unsafe original fixture URL')
    let translation: ReportEvent['translation'] = null
    if (e.translation !== null) {
      const t = object(e.translation)
      if (t.language !== 'en' || language === 'en')
        throw new Error('Invalid supplied translation')
      translation = {
        language: 'en',
        title: text(t.title, 240),
        summary: text(t.summary),
        supplied_by: text(t.supplied_by, 120),
      }
    }
    let correction: ReportEvent['correction'] = null
    if (e.correction !== null) {
      const c = object(e.correction)
      const previous = date(c.previous_updated_at)
      if (!updated || previous < published || previous >= updated)
        throw new Error('Invalid correction order')
      correction = {
        previous_title: text(c.previous_title, 240),
        previous_summary: text(c.previous_summary),
        previous_updated_at: previous,
        note: text(c.note, 600),
      }
    }
    return {
      id,
      kind: 'report',
      is_demo: true,
      status: 'attributed-claim',
      freshness: 'fixed-demo',
      category: 'civic',
      title: text(e.title, 240),
      summary: text(e.summary),
      region: text(e.region, 120),
      country:
        typeof e.country === 'string' && e.country === ''
          ? ''
          : text(e.country, 100),
      source_name: text(e.source_name, 160),
      source_language: language as ReportLanguage,
      source_url: e.source_url as string | null,
      published_at: published,
      updated_at: updated,
      occurred_at: occurred,
      collected_at: collected,
      coordinates,
      location_precision:
        e.location_precision as ReportEvent['location_precision'],
      uncertainty: text(e.uncertainty, 600),
      coverage_note: text(e.coverage_note),
      translation,
      correction,
    }
  })
}
export const reportExamples = parseReportExamples(rawExamples)
