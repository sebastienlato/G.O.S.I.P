import { describe, expect, it } from 'vitest'
import {
  categoryKeys,
  defaultFilters,
  parseFilters,
  serializeFilters,
} from './explorer'

describe('shareable explorer filters', () => {
  it('uses safe defaults for missing or invalid state', () => {
    expect(parseFilters('')).toEqual(defaultFilters)
    expect(
      parseFilters('?hours=Infinity&view=evil&map=remote&layers=__proto__'),
    ).toEqual(defaultFilters)
    expect(parseFilters('?hours=6.0&layers=environment,unknown')).toEqual(
      defaultFilters,
    )
  })
  it('round trips all supported choices including no layers', () => {
    for (const hours of [6, 24, 72, 168] as const) {
      for (const selectedCategories of [
        [],
        categoryKeys,
        ['science', 'civic'] as const,
      ]) {
        const state = {
          query: 'South Africa & ocean',
          hours,
          selectedCategories: [...selectedCategories],
          view: 'list' as const,
          mapMode: 'static' as const,
        }
        expect(parseFilters(serializeFilters(state))).toEqual(state)
      }
    }
  })
  it('normalizes duplicate and unordered layers and drops unknown parameters', () => {
    const state = parseFilters(
      '?layers=civic,environment,civic&secret=ignored&hours=24',
    )
    expect(serializeFilters(state)).toBe('?layers=environment%2Ccivic')
    expect(serializeFilters(defaultFilters)).toBe('')
  })
  it('bounds untrusted input and strips control characters', () => {
    expect(parseFilters(`?q=${'x'.repeat(250)}`).query).toHaveLength(200)
    expect(parseFilters('?q=%00Japan%0A').query).toBe('Japan')
    expect(parseFilters(`?q=${'x'.repeat(5000)}`)).toEqual(defaultFilters)
    expect(parseFilters('?q=%E0%A4%A')).toMatchObject({ hours: 24 })
  })
})
