import {
  decodePublished,
  LIVE_STALE_MS,
  type PublishedSnapshot,
} from './published'
import { decodeEONET } from './eonet'
import type { ExplorerEvent } from './events'

export const ARCHIVE_DAYS = 7
export const DAY = 86_400_000
export const ARCHIVE_SOURCE_BYTES = 500_000
export const ARCHIVE_MAX_BYTES = 7_100_000 // Legacy read bound until natural expiry.
export const ARCHIVE_WRITE_BYTES = 4_000_000
export const archiveSources = ['usgs', 'eonet'] as const
export type ArchiveSource = (typeof archiveSources)[number]
export interface Release {
  source_commit: string
  event: 'push' | 'schedule' | 'workflow_dispatch'
  run_id: string
  built_at: string
}
export interface Capture {
  captured_at: string
  release: Release
  sources: Record<ArchiveSource, PublishedSnapshot | null>
}
export interface Archive {
  version: 1
  attempted_at: string
  status: 'ok' | 'degraded'
  error:
    'capture-unavailable' | 'continuity-unavailable' | 'capacity-gap' | null
  continuity_since: string
  captures: Capture[]
}
export const byteLength = (raw: string) =>
  new TextEncoder().encode(raw).byteLength
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('Invalid archive object')
  return v as Record<string, unknown>
}
function keys(v: object, expected: string[]) {
  if (Object.keys(v).sort().join() !== expected.sort().join())
    throw Error('Unknown archive fields')
}
export function archiveTime(value: unknown, now: number): string {
  if (
    typeof value !== 'string' ||
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value ||
    Date.parse(value) > now
  )
    throw Error('Invalid archive time')
  return value
}
export function parseHistory(value: string | null) {
  if (value === 'latest') return value
  try {
    return archiveTime(value, Date.now() + 300_000)
  } catch {
    return ''
  }
}
export function decodeRelease(input: unknown, now: number): Release {
  const r = object(input)
  keys(r, ['source_commit', 'event', 'run_id', 'built_at'])
  if (
    typeof r.source_commit !== 'string' ||
    !/^[a-f0-9]{40}$/.test(r.source_commit) ||
    typeof r.run_id !== 'string' ||
    !/^\d{1,20}$/.test(r.run_id) ||
    !['push', 'schedule', 'workflow_dispatch'].includes(String(r.event))
  )
    throw Error('Invalid release')
  archiveTime(r.built_at, now)
  return r as unknown as Release
}
export function decodeArchiveSource(
  source: ArchiveSource,
  publication: PublishedSnapshot,
  now: number,
) {
  const raw = JSON.stringify(publication)
  if (byteLength(raw) > ARCHIVE_SOURCE_BYTES)
    throw Error('Archive source too large')
  return source === 'usgs' ? decodePublished(raw, now) : decodeEONET(raw, now)
}
export function validateCapture(input: unknown, now: number): Capture {
  const c = object(input)
  keys(c, ['captured_at', 'release', 'sources'])
  const captured = Date.parse(archiveTime(c.captured_at, now))
  const release = decodeRelease(c.release, captured)
  const sources = object(c.sources)
  keys(sources, [...archiveSources])
  let present = false
  for (const source of archiveSources) {
    if (sources[source] === null) continue
    const p = sources[source] as PublishedSnapshot
    const decoded = decodeArchiveSource(source, p, captured)
    if (Date.parse(decoded.health.attempted_at) > Date.parse(release.built_at))
      throw Error('Source newer than release')
    if (decoded.snapshot) present = true
  }
  if (!present) throw Error('No captured data')
  return c as unknown as Capture
}
export function decodeArchive(raw: string, now: number): Archive {
  if (byteLength(raw) > ARCHIVE_MAX_BYTES) throw Error('Archive too large')
  const a = object(JSON.parse(raw))
  keys(a, [
    'version',
    'attempted_at',
    'status',
    'error',
    'continuity_since',
    'captures',
  ])
  const attempted = Date.parse(archiveTime(a.attempted_at, now))
  archiveTime(a.continuity_since, attempted)
  if (
    a.version !== 1 ||
    !['ok', 'degraded'].includes(String(a.status)) ||
    ![
      null,
      'capture-unavailable',
      'continuity-unavailable',
      'capacity-gap',
    ].includes(a.error as null) ||
    (a.status === 'ok') !== (a.error === null) ||
    !Array.isArray(a.captures) ||
    a.captures.length > ARCHIVE_DAYS
  )
    throw Error('Invalid archive')
  let last = ''
  for (const item of a.captures) {
    const c = validateCapture(item, attempted)
    const day = c.captured_at.slice(0, 10)
    if (
      day <= last ||
      Date.parse(c.captured_at) < Date.parse(a.continuity_since as string)
    )
      throw Error('Duplicate or unordered capture')
    last = day
  }
  return a as unknown as Archive
}
// Revalidate old archives before pruning. Never redate or replace a daily capture.
export function pruneCaptures(captures: Capture[], now: number) {
  return captures
    .filter(
      (c) =>
        Date.parse(c.captured_at) > now - ARCHIVE_DAYS * DAY &&
        Date.parse(c.captured_at) <= now,
    )
    .slice(-ARCHIVE_DAYS)
}
export function captureEvents(
  capture: Capture | undefined,
  enabled: readonly string[],
): ExplorerEvent[] {
  if (!capture) return []
  return archiveSources.flatMap<ExplorerEvent>((source) => {
    const p = capture.sources[source]
    return enabled.includes(source) && p
      ? (decodeArchiveSource(source, p, Date.parse(capture.captured_at))
          .snapshot?.events ?? [])
      : []
  })
}
export function capturedStale(capture: Capture, source: ArchiveSource) {
  const h = capture.sources[source]?.health
  return (
    !h ||
    h.status !== 'ok' ||
    !h.fetched_at ||
    Date.parse(capture.captured_at) -
      Math.min(
        Date.parse(h.fetched_at),
        Date.parse(h.generated_at ?? h.fetched_at),
      ) >
      LIVE_STALE_MS
  )
}
