import { describe, expect, it } from 'vitest'
import {
  categories,
  DEMO_TIME,
  demoAge,
  filterEvents,
  formatTimestamp,
  parseDemoEvents,
  type Category,
} from './events'
import { demoEvents } from '../../tests/fixtures/legacy/events'
const all = Object.keys(categories) as Category[]

describe('demo provider boundary', () => {
  it('provides diverse, explicitly synthetic events and complete provenance', () => {
    expect(demoEvents).toHaveLength(18)
    expect(new Set(demoEvents.map((e) => e.category)).size).toBe(5)
    for (const e of demoEvents) {
      expect(e.is_demo).toBe(true)
      expect(e.status).toBe('simulated')
      expect(e.source_name).toContain('synthetic')
      expect(e.coverage_note).toContain('approximate')
      expect(Date.parse(e.occurred_at)).toBeLessThanOrEqual(DEMO_TIME)
    }
  })
  it.each([
    { is_demo: false },
    { status: 'verified' },
    { category: '__proto__' },
    { coordinates: [190, 0] },
    { coordinates: [NaN, 5] },
    { coordinates: [1] },
    { occurred_at: 'yesterday' },
    { occurred_at: '2026-02-30T16:00:00.000Z' },
    { published_at: '2020-01-01T00:00:00.000Z' },
    { title: '' },
    { summary: 'a'.repeat(2001) },
  ])('rejects malformed or misleading input: %j', (patch) => {
    expect(() => parseDemoEvents([{ ...demoEvents[0], ...patch }])).toThrow()
  })
  it('rejects non-arrays and duplicate identifiers', () => {
    expect(() => parseDemoEvents(null)).toThrow()
    expect(() => parseDemoEvents([demoEvents[0], demoEvents[0]])).toThrow(
      /Duplicate/,
    )
  })
})

describe('explorer filtering', () => {
  it('combines text, category, and time filters', () => {
    expect(
      filterEvents(demoEvents, '  JAPAN ', ['physical'], 6).map((e) => e.id),
    ).toEqual(['demo-001'])
    expect(filterEvents(demoEvents, 'Japan', ['digital'], 24)).toEqual([])
    expect(filterEvents(demoEvents, 'Canada', all, 6)).toEqual([])
    expect(
      filterEvents(demoEvents, 'Amazon basin', all, 24).map((e) => e.id),
    ).toEqual(['demo-002'])
  })
  it('uses a stable snapshot with newest first and includes boundary events', () => {
    expect(filterEvents(demoEvents, '', all, 6)).toHaveLength(6)
    expect(filterEvents(demoEvents, '', all, 24)).toHaveLength(12)
    expect(filterEvents(demoEvents, '', all, 72)).toHaveLength(15)
    expect(filterEvents(demoEvents, '', all, 168)).toHaveLength(18)
    const boundary = {
      ...demoEvents[0],
      occurred_at: new Date(DEMO_TIME - 6 * 3600000).toISOString(),
    }
    const future = {
      ...demoEvents[0],
      occurred_at: new Date(DEMO_TIME + 1000).toISOString(),
    }
    expect(filterEvents([boundary, future], '', all, 6)).toEqual([boundary])
    const results = filterEvents(demoEvents, '', all, 168)
    expect(results.at(0)?.id).toBe('demo-001')
    expect(results.at(-1)?.id).toBe('demo-018')
  })
  it('supports no selected layers and literal, harmless search input', () => {
    expect(filterEvents(demoEvents, '', [], 168)).toEqual([])
    expect(
      filterEvents(demoEvents, '<script>alert(1)</script>', all, 168),
    ).toEqual([])
  })
  it('formats age relative to the fixed snapshot and timestamps in UTC', () => {
    expect(demoAge(demoEvents[0].occurred_at)).toBe('30m')
    expect(demoAge(demoEvents[1].occurred_at)).toBe('1h')
    expect(formatTimestamp(demoEvents[0].collected_at)).toBe(
      '08 Oct 2026, 16:00 UTC',
    )
  })
})
